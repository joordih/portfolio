import XCTVapor
@testable import App

final class AppTests: XCTestCase {
    func testSafeNextAllowsRelativePaths() {
        XCTAssertEqual(AuthService.safeNext("/blog"), "/blog")
        XCTAssertEqual(AuthService.safeNext("/dashboard"), "/dashboard")
    }

    func testSafeNextRejectsExternalTargets() {
        XCTAssertEqual(AuthService.safeNext("//evil.com"), "/guestbook")
        XCTAssertEqual(AuthService.safeNext("https://evil.com"), "/guestbook")
        XCTAssertEqual(AuthService.safeNext("evil"), "/guestbook")
        XCTAssertEqual(AuthService.safeNext(nil), "/guestbook")
    }

    func testReadingLabel() {
        XCTAssertEqual(PostService.readingLabel(forHTML: "<p>one two three</p>"), "1 min →")
        let long = "<p>" + String(repeating: "word ", count: 400) + "</p>"
        XCTAssertEqual(PostService.readingLabel(forHTML: long), "2 min →")
    }

    func testTagsParsing() {
        XCTAssertEqual(TagsValue.string("a, b ,c").parsed(), ["a", "b", "c"])
        XCTAssertEqual(TagsValue.list([" a ", "", "b"]).parsed(), ["a", "b"])
    }

    func testAdminLoginDefault() {
        XCTAssertFalse(AppConfig.isAdminLogin(nil))
    }
}
