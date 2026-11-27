import Foundation
import Testing
@testable import CadenceCore

@Suite("NutritionEngine Golden Parity")
struct NutritionTests {
    @Test("Matches all 9 nutrition.golden.json cases")
    func matchesGolden() throws {
        let data = try GoldenFixtureLoader.loadData(fileName: "nutrition.golden.json")
        let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
        let cases = root["cases"] as! [[String: Any]]
        let decoder = JSONDecoder()

        func caseById(_ id: String) -> [String: Any] {
            cases.first(where: { ($0["id"] as? String) == id })!
        }

        // 1. short-hydration-only, 2. multiday-short-segment, 4. emergency-surge
        for id in ["short-hydration-only", "multiday-short-segment", "emergency-surge"] {
            let c = caseById(id)
            let params = try decoder.decode(IntensityModulatedCarbTargetParams.self, from: JSONSerialization.data(withJSONObject: c["input"]!))
            let expected = try decoder.decode(IntensityModulatedCarbTargetResult.self, from: JSONSerialization.data(withJSONObject: c["expected"]!))
            #expect(NutritionEngine.calculateIntensityModulatedCarbTarget(params) == expected, "Mismatch in \(id)")
        }

        // 3. endurance-auto-modulated
        do {
            let c = caseById("endurance-auto-modulated")
            let params = try decoder.decode(IntensityModulatedCarbTargetParams.self, from: JSONSerialization.data(withJSONObject: c["input"]!))
            let exp = c["expected"] as! [String: Any]
            let expMod = try decoder.decode(IntensityModulatedCarbTargetResult.self, from: JSONSerialization.data(withJSONObject: exp["modulated"]!))
            let expDyn = try decoder.decode(IntensityModulatedCarbTargetResult.self, from: JSONSerialization.data(withJSONObject: exp["dynamicCarbTarget"]!))
            let expReal = try decoder.decode(BottomUpPortionCounts.self, from: JSONSerialization.data(withJSONObject: exp["portionsRealFood"]!))
            let expSports = try decoder.decode(BottomUpPortionCounts.self, from: JSONSerialization.data(withJSONObject: exp["portionsSportsFuel"]!))

            let mod = NutritionEngine.calculateIntensityModulatedCarbTarget(params)
            let dyn = NutritionEngine.calculateDynamicCarbTarget(rideHours: 3.0, pctFtp: 62, carbOxidationGramPerHour: 110, gutCeilingGPerHr: 80, totalDays: 1)
            #expect(mod == expMod)
            #expect(dyn == expDyn)
            #expect(NutritionEngine.getBottomUpPortionCounts(targetOnBikeCarbsG: dyn.targetOnBikeCarbsG, preference: .realFood, rideHours: 3.0) == expReal)
            #expect(NutritionEngine.getBottomUpPortionCounts(targetOnBikeCarbsG: dyn.targetOnBikeCarbsG, preference: .sportsFuel, rideHours: 3.0) == expSports)
        }

        // 5. locked-low-intensity
        do {
            let c = caseById("locked-low-intensity")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            let pLow = try decoder.decode(IntensityModulatedCarbTargetParams.self, from: JSONSerialization.data(withJSONObject: input["lockedLow"]!))
            let pShort = try decoder.decode(IntensityModulatedCarbTargetParams.self, from: JSONSerialization.data(withJSONObject: input["lockedShort"]!))
            let eLow = try decoder.decode(IntensityModulatedCarbTargetResult.self, from: JSONSerialization.data(withJSONObject: exp["lockedLow"]!))
            let eShort = try decoder.decode(IntensityModulatedCarbTargetResult.self, from: JSONSerialization.data(withJSONObject: exp["lockedShort"]!))
            #expect(NutritionEngine.calculateIntensityModulatedCarbTarget(pLow) == eLow)
            #expect(NutritionEngine.calculateIntensityModulatedCarbTarget(pShort) == eShort)
        }

        // 6. hydration-hot-vs-cool
        do {
            let c = caseById("hydration-hot-vs-cool")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            for key in ["hotParams", "coolParams", "shortHydrationParams"] {
                let p = try decoder.decode(HydrationPlanParams.self, from: JSONSerialization.data(withJSONObject: input[key]!))
                let expKey = key == "hotParams" ? "hot" : (key == "coolParams" ? "cool" : "short")
                let e = try decoder.decode(HydrationPlanResult.self, from: JSONSerialization.data(withJSONObject: exp[expKey]!))
                #expect(NutritionEngine.calculateHydrationPlan(p) == e, "Mismatch in \(key)")
            }
        }

        // 7. fuel-split-single-vs-multiday
        do {
            let c = caseById("fuel-split-single-vs-multiday")
            let input = c["input"] as! [String: Any]
            let exp = c["expected"] as! [String: Any]
            let pSingle = try decoder.decode(FuelSplitParams.self, from: JSONSerialization.data(withJSONObject: input["splitSingle"]!))
            let pMulti = try decoder.decode(FuelSplitParams.self, from: JSONSerialization.data(withJSONObject: input["splitMulti"]!))
            let eSingle = try decoder.decode(EffectiveFuelSplitResult.self, from: JSONSerialization.data(withJSONObject: exp["singleDay"]!))
            let eMulti = try decoder.decode(EffectiveFuelSplitResult.self, from: JSONSerialization.data(withJSONObject: exp["multiDay"]!))
            let eItems = try decoder.decode([NutritionItem].self, from: JSONSerialization.data(withJSONObject: exp["phase2Items"]!))

            #expect(NutritionEngine.resolveEffectiveFuelSplit(pSingle) == eSingle)
            let multiSplit = NutritionEngine.resolveEffectiveFuelSplit(pMulti)
            #expect(multiSplit == eMulti)

            let hyd = NutritionEngine.calculateHydrationPlan(HydrationPlanParams(rideHours: 4, tempC: 28, legWatts: 210, bidonSizeMl: 650, frameBottleSlots: 2))
            let items = NutritionEngine.allocatePhase2OnBikeItems(targetOnBikeCarbsG: 240, preference: .mixed, rideHours: 4, lang: .en, hydrationPlan: hyd, fuelSplit: multiSplit)
            #expect(items == eItems)
        }

        // 8. plan-locked-vs-auto-pro
        do {
            let c = caseById("plan-locked-vs-auto-pro")
            let exp = c["expected"] as! [String: Any]
            let eLocked80 = try decoder.decode([NutritionPhase].self, from: JSONSerialization.data(withJSONObject: exp["locked80Plan"]!))
            let eAutoPro = try decoder.decode([NutritionPhase].self, from: JSONSerialization.data(withJSONObject: exp["autoProPlan"]!))
            let eLocked25 = try decoder.decode([NutritionPhase].self, from: JSONSerialization.data(withJSONObject: exp["lockedFloor25Plan"]!))

            let locked80 = NutritionEngine.getRealFoodNutritionPlan(
                lockerArrivalTime: "09:30", breakRoomTime: "09:50", departureTime: "07:30", lang: .en,
                options: RealFoodNutritionPlanOptions(
                    carbTargetGPerHr: 80, carbPacingMode: "locked", riderLevel: .regular, rideHours: 2,
                    nutritionPreference: .sportsFuel, pctFtp: 55, carbOxidationGramPerHour: 95,
                    logistics: LogisticsSettings(preRideStyle: "light-liquid")
                )
            )
            let autoPro = NutritionEngine.getRealFoodNutritionPlan(
                lockerArrivalTime: "09:30", breakRoomTime: "09:50", departureTime: "07:30", lang: .en,
                options: RealFoodNutritionPlanOptions(
                    carbTargetGPerHr: 90, carbPacingMode: "auto", riderLevel: .pro, rideHours: 2,
                    nutritionPreference: .sportsFuel, pctFtp: 55, carbOxidationGramPerHour: 95
                )
            )
            let locked25 = NutritionEngine.getRealFoodNutritionPlan(
                lockerArrivalTime: "09:30", breakRoomTime: "09:50", departureTime: "07:30", lang: .en,
                options: RealFoodNutritionPlanOptions(
                    carbTargetGPerHr: 25, carbPacingMode: "locked", riderLevel: .regular, rideHours: 2,
                    nutritionPreference: .sportsFuel, pctFtp: 55, carbOxidationGramPerHour: 95
                )
            )
            #expect(locked80 == eLocked80)
            #expect(autoPro == eAutoPro)
            #expect(locked25 == eLocked25)
        }

        // 9. plan-dietary-vegan-gf-nofridge-fr
        do {
            let c = caseById("plan-dietary-vegan-gf-nofridge-fr")
            let exp = c["expected"] as! [String: Any]
            let ePhases = try decoder.decode([NutritionPhase].self, from: JSONSerialization.data(withJSONObject: exp["phases"]!))

            var veganSpecs = RiderBikeSpecs.defaultSpecs
            veganSpecs.dietaryFilters = [.vegan, .glutenFree, .nutFree]
            veganSpecs.telemetryMode = .quantitative

            let resolvedPantry = PantryCatalog.resolveCompliantPantry(specs: veganSpecs, hasDestinationFridge: false)
            #expect(resolvedPantry.onBikeLiquid.id == (exp["compliantLiquidId"] as! String))
            #expect(resolvedPantry.onBikeSolids.map(\.id) == (exp["compliantSolidIds"] as! [String]))
            #expect(resolvedPantry.postRide.id == (exp["compliantPostRideId"] as! String))

            let veganPlanFr = NutritionEngine.getRealFoodNutritionPlan(
                lockerArrivalTime: "08:30", breakRoomTime: "08:50", departureTime: "07:35", lang: .fr,
                options: RealFoodNutritionPlanOptions(
                    rideHours: 2.5, pctFtp: 74, totalDays: 1,
                    compliantPantry: resolvedPantry,
                    logistics: LogisticsSettings(preRideStyle: "fasted-rollout", hasDestinationFridge: false, splitPostRideRecovery: true)
                ),
                riderSpecs: veganSpecs
            )
            #expect(veganPlanFr == ePhases)
        }
    }
}
