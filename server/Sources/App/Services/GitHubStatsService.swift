import Foundation
import Vapor

struct GitHubStatsService {
    let client: Client
    let cacheRepository: GitHubStatsCacheRepository
    let siteSettingRepository: SiteSettingRepository
    let accessToken: String
    let username: String

    private let cacheTTL = 6 * 60 * 60 * 1000
    private let activityCacheVersion = "v2"

    func availableYears() async throws -> GitHubActivityYearsDTO {
        let years = try await siteSettingRepository.resolveActivityYears()
        return GitHubActivityYearsDTO(years: years, username: username)
    }

    func activity(for year: Int) async throws -> GitHubActivityDTO {
        let cacheKey = "activity:\(username):\(year):\(activityCacheVersion)"
        let now = nowMillis()

        if
            let cached = try await cacheRepository.find(key: cacheKey),
            cached.expiresAt > now,
            let data = cached.payloadJson.data(using: .utf8),
            let payload = try? JSONDecoder().decode(GitHubActivityDTO.self, from: data)
        {
            return payload
        }

        let range = ContributionCalendar.activityRange(for: year)
        let yearPayload = try await fetchActivity(year: year, from: range.from, to: range.to)
        let lifetimeStats = try await fetchLifetimeStats()
        let payload = mergeLifetime(into: yearPayload, lifetime: lifetimeStats)

        if let encoded = try? JSONEncoder().encode(payload), let json = String(data: encoded, encoding: .utf8) {
            try await cacheRepository.upsert(
                key: cacheKey,
                payloadJson: json,
                expiresAt: now + cacheTTL
            )
        }

        return payload
    }

    private func fetchActivity(year: Int, from: String, to: String) async throws -> GitHubActivityDTO {
        let collection = try await fetchCollection(from: from, to: to)
        let trimmedWeeks = trimWeeks(collection.contributionCalendar.weeks, year: year)
        let days = ContributionCalendar.flattenDays(from: trimmedWeeks)
        let weeks = ContributionCalendar.mapWeeks(trimmedWeeks)

        let calculatorDays = days.map { GitHubStatsCalculator.Day(date: $0.date, count: $0.count) }
        let peak = GitHubStatsCalculator.peakDay(from: calculatorDays)
        let stats = GitHubActivityStatsDTO(
            lifetimeCommits: 0,
            peakCommitsInDay: peak.count,
            peakDay: peak.date,
            longestStreak: GitHubStatsCalculator.longestStreak(from: calculatorDays),
            yearCommits: collection.contributionCalendar.totalContributions
        )

        let topPublicRepos = collection.commitContributionsByRepository
            .filter { !$0.repository.isPrivate }
            .sorted { $0.contributions.totalCount > $1.contributions.totalCount }
            .prefix(8)
            .map {
                GitHubTopRepoDTO(
                    fullName: $0.repository.nameWithOwner,
                    url: $0.repository.url,
                    commits: $0.contributions.totalCount
                )
            }

        return GitHubActivityDTO(
            year: year,
            days: days,
            weeks: weeks,
            stats: stats,
            topPublicRepos: Array(topPublicRepos)
        )
    }

    private func fetchLifetimeStats() async throws -> GitHubActivityStatsDTO {
        let cacheKey = "activity:\(username):lifetime"
        let now = nowMillis()

        if
            let cached = try await cacheRepository.find(key: cacheKey),
            cached.expiresAt > now,
            let data = cached.payloadJson.data(using: .utf8),
            let payload = try? JSONDecoder().decode(GitHubActivityStatsDTO.self, from: data)
        {
            return payload
        }

        let currentYear = Calendar.current.component(.year, from: Date())
        var allDays: [GitHubStatsCalculator.Day] = []
        var lifetimeCommits = 0

        for year in ActivityYearsSettings.lifetimeStartYear...currentYear {
            let range = ContributionCalendar.activityRange(for: year)

            guard let collection = try await fetchCollectionIfAvailable(from: range.from, to: range.to) else {
                continue
            }

            lifetimeCommits += collection.contributionCalendar.totalContributions
            let trimmedWeeks = trimWeeks(collection.contributionCalendar.weeks, year: year)
            let days = ContributionCalendar.flattenDays(from: trimmedWeeks)
            allDays.append(contentsOf: days.map { GitHubStatsCalculator.Day(date: $0.date, count: $0.count) })
        }

        let peak = GitHubStatsCalculator.peakDay(from: allDays)
        let stats = GitHubActivityStatsDTO(
            lifetimeCommits: lifetimeCommits,
            peakCommitsInDay: peak.count,
            peakDay: peak.date,
            longestStreak: GitHubStatsCalculator.longestStreak(from: allDays),
            yearCommits: 0
        )

        if let encoded = try? JSONEncoder().encode(stats), let json = String(data: encoded, encoding: .utf8) {
            try await cacheRepository.upsert(
                key: cacheKey,
                payloadJson: json,
                expiresAt: now + cacheTTL
            )
        }

        return stats
    }

    private func mergeLifetime(
        into yearPayload: GitHubActivityDTO,
        lifetime: GitHubActivityStatsDTO
    ) -> GitHubActivityDTO {
        GitHubActivityDTO(
            year: yearPayload.year,
            days: yearPayload.days,
            weeks: yearPayload.weeks,
            stats: GitHubActivityStatsDTO(
                lifetimeCommits: lifetime.lifetimeCommits,
                peakCommitsInDay: lifetime.peakCommitsInDay,
                peakDay: lifetime.peakDay,
                longestStreak: lifetime.longestStreak,
                yearCommits: yearPayload.stats.yearCommits
            ),
            topPublicRepos: yearPayload.topPublicRepos
        )
    }

    private func trimWeeks(
        _ weeks: [GraphQLResponse.WeekNode],
        year: Int
    ) -> [ContributionCalendar.Week] {
        let mapped = weeks.map { week in
            ContributionCalendar.Week(contributionDays: week.contributionDays.map {
                ContributionCalendar.Week.Day(date: $0.date, contributionCount: $0.contributionCount)
            })
        }
        return ContributionCalendar.trimWeeks(mapped, year: year)
    }

    private func fetchCollectionIfAvailable(from: String, to: String) async throws -> GraphQLResponse.CollectionNode? {
        do {
            return try await fetchCollection(from: from, to: to)
        } catch let error as ServiceError {
            if case .notFound = error {
                return nil
            }
            throw error
        }
    }

    private func fetchCollection(from: String, to: String) async throws -> GraphQLResponse.CollectionNode {
        let query = """
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
              commitContributionsByRepository(maxRepositories: 20) {
                repository {
                  nameWithOwner
                  url
                  isPrivate
                }
                contributions {
                  totalCount
                }
              }
            }
          }
        }
        """

        let response = try await client.post("https://api.github.com/graphql") { request in
            request.headers.bearerAuthorization = BearerAuthorization(token: accessToken)
            request.headers.replaceOrAdd(name: .userAgent, value: "portfolio-app")
            request.headers.contentType = .json
            try request.content.encode(GraphQLRequest(
                query: query,
                variables: [
                    "login": username,
                    "from": from,
                    "to": to
                ]
            ))
        }

        guard response.status == .ok else {
            let body = response.body.map { String(buffer: $0) } ?? ""
            throw ServiceError.badRequest("Failed to fetch GitHub activity (HTTP \(response.status.code)): \(body)")
        }

        let decoded = try response.content.decode(GraphQLResponse.self)

        if let errors = decoded.errors, !errors.isEmpty {
            let messages = errors.map(\.message).joined(separator: "; ")
            if decoded.data?.user == nil {
                throw ServiceError.badRequest("GitHub GraphQL error: \(messages)")
            }
        }

        guard let collection = decoded.data?.user?.contributionsCollection else {
            throw ServiceError.notFound("GitHub user '\(username)' not found or has no public activity")
        }

        return collection
    }

    private struct GraphQLRequest: Content {
        let query: String
        let variables: [String: String]
    }

    private struct GraphQLResponse: Content {
        let data: DataNode?
        let errors: [GraphQLErrorNode]?

        struct DataNode: Content {
            let user: UserNode?
        }

        struct GraphQLErrorNode: Content {
            let message: String
        }

        struct UserNode: Content {
            let contributionsCollection: CollectionNode?
        }

        struct CollectionNode: Content {
            let contributionCalendar: CalendarNode
            let commitContributionsByRepository: [RepoContributionNode]
        }

        struct CalendarNode: Content {
            let totalContributions: Int
            let weeks: [WeekNode]
        }

        struct WeekNode: Content {
            let contributionDays: [DayNode]
        }

        struct DayNode: Content {
            let date: String
            let contributionCount: Int
        }

        struct RepoContributionNode: Content {
            let repository: RepositoryNode
            let contributions: CountNode
        }

        struct RepositoryNode: Content {
            let nameWithOwner: String
            let url: String
            let isPrivate: Bool
        }

        struct CountNode: Content {
            let totalCount: Int
        }
    }
}