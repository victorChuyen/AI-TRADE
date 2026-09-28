"""Integration tests for Lucky Trade Server, Engine, and Dashboard API."""
import unittest
import threading
import time
import urllib.request
import json
from pathlib import Path
import tempfile

from app.server import build_server
from app.market import SYMBOLS


class TestServerAndDashboard(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.db_path = Path(cls.temp_dir.name) / "test_lucky.db"
        cls.port = 8799
        cls.server = build_server(port=cls.port, db_path=cls.db_path)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.5)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.temp_dir.cleanup()

    def _get(self, path):
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}")
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read(), resp.headers.get("Content-Type")

    def _post(self, path, body, csrf_token):
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Lucky-CSRF": csrf_token,
                "Origin": f"http://127.0.0.1:{self.port}"
            }
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            print(f"\n[SERVER RETURNED HTTP {e.code}]: {err_body}")
            raise

    def test_session_and_static_files(self):
        # 1. Session
        status, content, ctype = self._get("/api/session")
        self.assertEqual(status, 200)
        data = json.loads(content.decode("utf-8"))
        self.assertIn("csrf", data)

        # 2. Static HTML
        status, html, ctype = self._get("/")
        self.assertEqual(status, 200)
        self.assertIn("text/html", ctype)
        self.assertIn(b"LUCKY TRADE AI", html)

        # 3. Static JS & CSS
        status, js, ctype = self._get("/app.js")
        self.assertEqual(status, 200)
        self.assertIn(b"Lucky Trade AI", js)

        status, css, ctype = self._get("/style.css")
        self.assertEqual(status, 200)
        self.assertIn(b"--bg-primary", css)

    def test_engine_state_and_proposals_flow(self):
        # Get CSRF
        _, session_content, _ = self._get("/api/session")
        csrf = json.loads(session_content.decode("utf-8"))["csrf"]

        # Check State
        status, content, _ = self._get("/api/state?symbol=BTCUSD")
        self.assertEqual(status, 200)
        state = json.loads(content.decode("utf-8"))
        
        self.assertEqual(len(state["watchlist"]), 6)
        self.assertIn("proposals", state)
        self.assertIn("account", state)

        # Advance step
        current_step = state["account"]["step"]
        status, adv_res = self._post("/api/advance", {"step": current_step}, csrf)
        self.assertTrue(adv_res.get("ok"))

        # Re-fetch state
        _, content2, _ = self._get("/api/state?symbol=EURUSD")
        state2 = json.loads(content2.decode("utf-8"))
        self.assertEqual(state2["account"]["step"], current_step + 1)

        # If proposals exist, test approval
        proposals = state2.get("proposals", [])
        if proposals:
            target_prop = proposals[0]
            print(f"\n[TARGET PROPOSAL]: id={target_prop['id']}, sym={target_prop['symbol']}, side={target_prop['side']}, entry={target_prop['entry']}, sl={target_prop['sl']}, tp={target_prop['tp']}, vol={target_prop['volume']}")
            status, app_res = self._post("/api/proposals/approve", {"id": target_prop["id"]}, csrf)
            self.assertEqual(status, 200)
            self.assertIn("id", app_res) # Position ID

            # Check open positions
            _, content3, _ = self._get("/api/state?symbol=EURUSD")
            state3 = json.loads(content3.decode("utf-8"))
            self.assertGreater(len(state3["positions"]), 0)

            # Close position
            pos_id = state3["positions"][0]["id"]
            status, close_res = self._post("/api/close", {"id": pos_id}, csrf)
            self.assertTrue(close_res.get("ok"))


if __name__ == "__main__":
    unittest.main()
