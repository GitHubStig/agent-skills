/**
 * Single source of truth for the tool's version.
 *
 * Deliberately NOT in skill.md frontmatter: the Agent Skills spec supports only
 * `name` and `description`, and unrecognised keys risk rejection when a skill is
 * uploaded to claude.ai or the /v1/skills API. Keeping the version here means it
 * travels with the code, stamps the artifacts it produces, and never threatens
 * skill validation.
 */
export const VERSION = '1.0.3';
