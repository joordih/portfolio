import Fluent
import FluentMongoDriver
import Vapor

protocol SiteSettingRepository {
    func activityYears() async throws -> [Int]?
    func setActivityYears(_ years: [Int]) async throws -> [Int]
    func resolveActivityYears() async throws -> [Int]
}

struct FluentSiteSettingRepository: SiteSettingRepository {
    let database: Database

    func activityYears() async throws -> [Int]? {
        guard
            let setting = try await SiteSetting.query(on: database)
                .filter(\.$key == ActivityYearsSettings.settingKey)
                .first(),
            !setting.value.isEmpty
        else {
            return nil
        }
        return setting.value
    }

    func setActivityYears(_ years: [Int]) async throws -> [Int] {
        let normalized = ActivityYearsSettings.normalize(years)
        let now = nowMillis()

        if let existing = try await SiteSetting.query(on: database)
            .filter(\.$key == ActivityYearsSettings.settingKey)
            .first()
        {
            existing.value = normalized
            existing.updatedAt = now
            try await existing.update(on: database)
            return normalized
        }

        let setting = SiteSetting(
            key: ActivityYearsSettings.settingKey,
            value: normalized,
            updatedAt: now
        )
        try await setting.create(on: database)
        return normalized
    }

    func resolveActivityYears() async throws -> [Int] {
        guard let configured = try await activityYears() else {
            return ActivityYearsSettings.defaultYears()
        }
        let normalized = ActivityYearsSettings.normalize(configured)
        return normalized.isEmpty ? ActivityYearsSettings.defaultYears() : normalized
    }
}