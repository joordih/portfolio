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

    func testGitHubStatsPeakDay() {
        let days = [
            GitHubStatsCalculator.Day(date: "2025-01-01", count: 2),
            GitHubStatsCalculator.Day(date: "2025-01-02", count: 8),
            GitHubStatsCalculator.Day(date: "2025-01-03", count: 3)
        ]
        let peak = GitHubStatsCalculator.peakDay(from: days)
        XCTAssertEqual(peak.count, 8)
        XCTAssertEqual(peak.date, "2025-01-02")
    }

    func testGitHubStatsLongestStreak() {
        let days = [
            GitHubStatsCalculator.Day(date: "2025-01-01", count: 1),
            GitHubStatsCalculator.Day(date: "2025-01-02", count: 2),
            GitHubStatsCalculator.Day(date: "2025-01-03", count: 1),
            GitHubStatsCalculator.Day(date: "2025-01-05", count: 4),
            GitHubStatsCalculator.Day(date: "2025-01-06", count: 2)
        ]
        XCTAssertEqual(GitHubStatsCalculator.longestStreak(from: days), 3)
    }

    func testGitHubStatsLifetimeCommits() {
        let days = [
            GitHubStatsCalculator.Day(date: "2025-01-01", count: 2),
            GitHubStatsCalculator.Day(date: "2025-01-02", count: 3)
        ]
        XCTAssertEqual(GitHubStatsCalculator.lifetimeCommits(from: days), 5)
    }

    func testContributionCalendarTrimsFutureWeeksForCurrentYear() {
        let currentYear = Calendar.current.component(.year, from: Date())
        let today = ContributionCalendar.localDateISO()
        let weeks = [
            ContributionCalendar.Week(contributionDays: [
                .init(date: "\(currentYear)-01-01", contributionCount: 2),
                .init(date: "\(currentYear)-01-02", contributionCount: 0)
            ]),
            ContributionCalendar.Week(contributionDays: [
                .init(date: today, contributionCount: 4),
                .init(date: "\(currentYear)-12-31", contributionCount: 9)
            ]),
            ContributionCalendar.Week(contributionDays: [
                .init(date: "\(currentYear)-12-25", contributionCount: 1)
            ])
        ]

        let trimmed = ContributionCalendar.trimWeeks(weeks, year: currentYear)
        XCTAssertEqual(trimmed.count, 2)
        XCTAssertEqual(trimmed.last?.contributionDays.last?.contributionCount, 0)
    }

    func testActivityYearsNormalize() {
        let currentYear = Calendar.current.component(.year, from: Date())
        let normalized = ActivityYearsSettings.normalize([currentYear, currentYear - 2, 1999, currentYear + 1])
        XCTAssertEqual(normalized, [currentYear, currentYear - 2])
    }
}
