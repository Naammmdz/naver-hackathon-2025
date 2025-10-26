from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://localhost:8080/app")

    # Click the "Board" button in the sidebar
    page.get_by_role("button", name="Board").click()

    # Click the "Add Board" button
    page.get_by_role("button", name="Add Board").click()

    # Fill in the new board title
    page.get_by_placeholder("Board name...").fill("My New Board")

    # Press Enter to create the board
    page.get_by_placeholder("Board name...").press("Enter")

    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
