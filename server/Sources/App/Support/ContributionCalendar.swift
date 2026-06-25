import Foundation

enum ContributionCalendar {
    struct Week {
        var contributionDays: [Day]

        struct Day {
            let date: String
            var contributionCount: Int
        }
    }

    static func localDateISO(from date: Date = Date()) -> String {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        let year = components.year ?? 0
        let month = components.month ?? 0
        let day = components.day ?? 0
        return String(format: "%04d-%02d-%02d", year, month, day)
    }

    static func activityRange(for year: Int) -> (from: String, to: String) {
        let from = "\(year)-01-01T00:00:00Z"
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())

        guard year == currentYear else {
            return (from, "\(year + 1)-01-01T00:00:00Z")
        }

        let startOfToday = calendar.startOfDay(for: Date())
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: startOfToday) ?? Date()
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return (from, formatter.string(from: tomorrow))
    }

    static func trimWeeks(_ weeks: [Week], year: Int) -> [Week] {
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: Date())
        guard year == currentYear else { return weeks }

        let today = localDateISO()
        var endIndex = -1

        for (index, week) in weeks.enumerated() {
            if week.contributionDays.contains(where: { $0.date <= today }) {
                endIndex = index
            }
            if week.contributionDays.contains(where: { $0.date == today }) {
                endIndex = index
                break
            }
        }

        guard endIndex >= 0 else { return [] }

        return Array(weeks.prefix(endIndex + 1)).map { week in
            Week(contributionDays: week.contributionDays.map { day in
                Week.Day(
                    date: day.date,
                    contributionCount: day.date > today ? 0 : day.contributionCount
                )
            })
        }
    }

    static func flattenDays(from weeks: [Week]) -> [GitHubActivityDayDTO] {
        weeks.flatMap { week in
            week.contributionDays.compactMap { day in
                guard !day.date.isEmpty else { return nil }
                return GitHubActivityDayDTO(date: day.date, count: day.contributionCount)
            }
        }
    }

    static func mapWeeks(_ weeks: [Week]) -> [GitHubActivityWeekDTO] {
        weeks.map { week in
            GitHubActivityWeekDTO(days: week.contributionDays.map {
                GitHubActivityDayDTO(date: $0.date, count: $0.contributionCount)
            })
        }
    }
}

enum ActivityYearsSettings {
    static let lifetimeStartYear = 2008
    static let settingKey = "activity_years"

    static func defaultYears() -> [Int] {
        let currentYear = Calendar.current.component(.year, from: Date())
        return Array((currentYear - 5)...currentYear).reversed()
    }

    static func normalize(_ years: [Int]) -> [Int] {
        let currentYear = Calendar.current.component(.year, from: Date())
        let normalized = Set(years.filter { $0 >= lifetimeStartYear && $0 <= currentYear })
        return normalized.sorted(by: >)
    }
}