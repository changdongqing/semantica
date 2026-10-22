// Ensure react-i18next has an initialized instance before component tests
// render translated UI, and force English so text assertions stay stable
// regardless of the host machine's locale.
import i18n from "../src/i18n/index.ts";

await i18n.changeLanguage("en");
