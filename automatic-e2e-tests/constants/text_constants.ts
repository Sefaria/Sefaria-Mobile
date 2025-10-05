/**
 * ──────────────────────────────────────────────────────────────
 * FILE ROLE: Text Constants for Testing Framework
 * 
 * DESCRIPTION:
 *  - Centralizes all static text values used throughout the testing framework.
 *  - Facilitates easier maintenance and localization of UI and content strings.
 * USAGE:
 *  - Import these constants wherever fixed text is needed in tests.
 * ──────────────────────────────────────────────────────────────
 */

export const BAMIDBAR_1 = {
    en: "On the first day of the second month, in the second year following the exodus from the land of Egypt, יהוה spoke to Moses in the wilderness of Sinai, in the Tent of Meeting, saying:",
    he: "וַיְדַבֵּ֨ר יְהֹוָ֧ה אֶל־מֹשֶׁ֛ה בְּמִדְבַּ֥ר סִינַ֖י בְּאֹ֣הֶל מוֹעֵ֑ד בְּאֶחָד֩ לַחֹ֨דֶשׁ הַשֵּׁנִ֜י בַּשָּׁנָ֣ה הַשֵּׁנִ֗ית לְצֵאתָ֛ם מֵאֶ֥רֶץ מִצְרַ֖יִם לֵאמֹֽר׃"
}

// Constant to hold information about Mishnah Text
export const MISHNAH = {
    en: "Mishnah",
    he: "משנה",
    blurb: "The Mishnah is the first major work of rabbinic literature, consisting of teachings transmitted over hundreds of years and compiled by ",
    sedarim: ["SEDER ZERAIM (Agriculture)", "SEDER MOED (Holidays)", "SEDER NASHIM (Family law)", "SEDER NEZIKIN (Damages)", "SEDER KODASHIM (Sacrifices)", "SEDER TAHOROT (Purity)"],
    content_desc: {
        berakot: {
            title: "Mishnah Berakhot", 
            blurb: "Blessings and prayers, focusing on Shema and the Amidah."
        },
        peah:   {
            title: "Mishnah Peah", 
            blurb: "Crops left in the corner of a field for the poor to take, other agricultural gifts to the poor."
        }
    }
}

// constant for Aleinu Topic
export const ALEINU = {
    en: "Aleinu",
    he: "עלינו",
    blurb: "The concluding reading of prayer services, Aleinu (Upon us) reminds Jews of their historical and universal mission. It thus provides transition from the lofty world of prayer to the world of human activity. Aleinu consists of two paragraphs, traditionally associated with Joshua.",
    connection: 'This source is connected to',// "Aleinu" by Curation of the Sefaria Learning Team.',
    first_source: 'Siddur Ashkenaz, Weekday, Shacharit, Concluding Prayers, Alenu 1',
    first_source_header: 'Weekday, Shacharit, Concluding Prayers, Alenu',
    sheets_search: 'Shabbes Shuva',
    // different texts for iOS and Android
    topics_related: (platform: 'ios' | 'android') => {
        return platform === 'ios' ? "Topics Related to Aleinu" : "Topics Related To Aleinu";
    }
}

// Months storage for Sefaria and getting current Jewish Date
export const HEBREW_MONTHS = [
    "Tishri", "Heshvan", "Kislev", "Tevet",
    "Shevat", "Adar", "Adar II", "Nisan",
    "Iyar", "Sivan", "Tammuz", "Av", "Elul"
];