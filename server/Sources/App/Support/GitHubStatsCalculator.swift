import Foundation

enum GitHubStatsCalculator {
    struct Day {
        let date: String
        let count: Int
    }

    static func peakDay(from days: [Day]) -> (count: Int, date: String?) {
        guard let best = days.max(by: { $0.count < $1.count }), best.count > 0 else {
            return (0, nil)
        }
        return (best.count, best.date)
    }

    static func longestStreak(from days: [Day]) -> Int {
        let sorted = days.sorted { $0.date < $1.date }
        var longest = 0
        var current = 0
        var previousDate: Date?

        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"

        for day in sorted where day.count > 0 {
            guard let date = formatter.date(from: day.date) else { continue }

            if let previousDate {
                let delta = Calendar.current.dateComponents([.day], from: previousDate, to: date).day ?? 0
                if delta == 1 {
                    current += 1
                } else {
                    current = 1
                }
            } else {
                current = 1
            }

            longest = max(longest, current)
            previousDate = date
        }

        return longest
    }

    static func lifetimeCommits(from days: [Day]) -> Int {
        days.reduce(0) { $0 + $1.count }
    }
}