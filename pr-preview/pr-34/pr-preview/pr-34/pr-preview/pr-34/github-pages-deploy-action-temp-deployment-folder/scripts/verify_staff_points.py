#!/usr/bin/env python3
"""Serve a temp copy of the site with a tiny staff CSV, open Staff Points, assert balance and reward row styling."""

from __future__ import annotations

import http.server
import shutil
import socketserver
import tempfile
import threading
import time
import urllib.parse
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parent.parent
PORT = 8878

FIXTURE_CSV = """Name,Role,Staff Points Balance,Staff Points Lifetime
boopyboop.,DM,70,80
otheruser,Mod,5,5
"""


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        site = Path(tmp)
        shutil.copy2(ROOT / "index.html", site / "index.html")
        shutil.copytree(ROOT / "assets", site / "assets")
        (site / "staff_fixture.csv").write_text(FIXTURE_CSV, encoding="utf-8")

        handler = http.server.SimpleHTTPRequestHandler
        httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
        httpd.allow_reuse_address = True
        orig_cwd = Path.cwd()
        try:
            import os

            os.chdir(site)
            thread = threading.Thread(target=httpd.serve_forever, daemon=True)
            thread.start()
            time.sleep(0.2)

            fixture_url = f"http://127.0.0.1:{PORT}/staff_fixture.csv"
            qs = urllib.parse.urlencode({"staffCsv": fixture_url})
            base = f"http://127.0.0.1:{PORT}/index.html?{qs}"

            opts = Options()
            opts.add_argument("--headless=new")
            opts.add_argument("--no-sandbox")
            opts.add_argument("--disable-dev-shm-usage")
            opts.add_argument("--window-size=1280,900")

            driver = webdriver.Chrome(options=opts)
            wait = WebDriverWait(driver, 15)
            try:
                driver.get(base)
                wait.until(EC.element_to_be_clickable((By.ID, "tab-staff"))).click()

                user = wait.until(EC.visibility_of_element_located((By.ID, "staff-username")))
                user.clear()
                user.send_keys("boopyboop.")
                wait.until(EC.element_to_be_clickable((By.ID, "staff-lookup"))).click()

                wait.until(EC.visibility_of_element_located((By.ID, "staff-balance-wrap")))
                bal = driver.find_element(By.ID, "staff-balance").text.strip()
                assert bal == "70", f"expected balance 70 from fixture, got {bal!r}"

                rows = driver.find_elements(By.CSS_SELECTOR, "#staff-rewards-tbody tr")
                assert len(rows) == 3, f"expected 3 reward rows, got {len(rows)}"

                def is_grey(tr) -> bool:
                    return "is-unaffordable" in (tr.get_attribute("class") or "")

                assert not is_grey(rows[0]), "Common (30) should be affordable at 70 SP"
                assert not is_grey(rows[1]), "Uncommon (60) should be affordable at 70 SP"
                assert is_grey(rows[2]), "Rare (120) should be greyed out at 70 SP"

                print("OK: Staff Points lookup and reward affordability checks passed.")
            finally:
                driver.quit()
                httpd.shutdown()
                httpd.server_close()
        finally:
            import os

            os.chdir(orig_cwd)


if __name__ == "__main__":
    main()
