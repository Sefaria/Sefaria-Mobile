import {getSafeViewCategory} from "../getSafeViewStyles";

describe('getSafeViewCategory', () => {
    const testInputs = [
        [{menu: null, navigationCategories: ["Mishnah"], sheet: null, textTitle: "Berakhot"}, "Talmud", "Talmud"],
        [{menu: null, navigationCategories: ["Mishnah"], sheet: {id:1}, textTitle: ""}, "Other", "Other"],
        [{menu: "navigation", navigationCategories: ["Talmud"], sheet: null, textTitle: ""}, "Talmud", null],
        [{menu: "text toc", navigationCategories: ["Talmud"], sheet: null, textTitle: "Genesis"}, "Tanakh", "Tanakh"],
        [{menu: "sheet meta", navigationCategories: ["Talmud"], sheet: {id: 1}, textTitle: ""}, "Other", "Other"],
        [{menu: "settings", navigationCategories: [], sheet: {id: 1}, textTitle: ""}, "Other", null],
        [{menu: "account", navigationCategories: ["Talmud"], sheet: null, textTitle: "Berakhot"}, "N/A", null],
        [{menu: "settings", navigationCategories: ["Talmud"], sheet: null, textTitle: "Genesis"}, "Other", null],
    ];
    test.each(testInputs)('account menu', (params, expectedCat, mockPrimaryCategory) => {
        Sefaria.primaryCategoryForTitle = jest.fn(() => mockPrimaryCategory);
        const cat = getSafeViewCategory(params);
        expect(cat).toBe(expectedCat);
    });
});