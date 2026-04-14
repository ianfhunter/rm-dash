#!/usr/bin/env python3
"""Create a tiny RMMagicItems.xlsx, serve the site, open Loot tab, search budget 200, assert tbody has rows."""

import http.server
import socketserver
import threading
import time
from pathlib import Path

from openpyxl import Workbook
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "RMMagicItems.xlsx"
PORT = 8877


def write_fixture_xlsx() -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Items"
    ws.append(["Name", "Cost (GP)", "Source"])
    ws.append(["Test Dagger", 50, "fixture"])
    ws.append(["Test Cloak", 150, "fixture"])
    ws.append(["Test Crown", 250, "fixture"])
    wb.save(XLSX)


def main() -> None:
    write_fixture_xlsx()

    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    httpd.allow_reuse_address = True
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.2)

    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1280,900")

    driver = webdriver.Chrome(options=opts)
    wait = WebDriverWait(driver, 15)
    try:
        base = f"http://127.0.0.1:{PORT}/"
        driver.get(base + "index.html")

        wait.until(EC.element_to_be_clickable((By.ID, "tab-loot"))).click()
        budget = wait.until(EC.visibility_of_element_located((By.ID, "loot-budget")))
        budget.clear()
        budget.send_keys("200")
        wait.until(EC.element_to_be_clickable((By.ID, "loot-search"))).click()

        wait.until(EC.visibility_of_element_located((By.ID, "loot-table-wrap")))
        rows = wait.until(
            lambda d: d.find_elements(By.CSS_SELECTOR, "#loot-tbody tr")
        )
        assert len(rows) >= 1, f"expected at least 1 data row, got {len(rows)}"

        body_text = driver.find_element(By.ID, "loot-tbody").text
        assert "Test Dagger" in body_text, body_text
        assert "Test Cloak" in body_text, body_text
        assert "Test Crown" not in body_text, "250 gp item should be excluded"

        print("OK: Loot table shows", len(rows), "row(s) within 200 gp budget.")
    finally:
        driver.quit()
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    import os

    os.chdir(ROOT)
    main()
