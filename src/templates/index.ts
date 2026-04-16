export type Tool = "copilot" | "opencode";

export interface TemplateEntry {
  relativePath: string;
  render: (tool: Tool) => string;
}

import * as analyst from "./agents/fabys-analyst.js";
import * as critic from "./agents/fabys-critic.js";
import * as explorer from "./agents/fabys-explorer.js";
import * as implementer from "./agents/fabys-implementer.js";
import * as planner from "./agents/fabys-planner.js";
import * as rapid from "./agents/fabys-rapid.js";
import * as reviewer from "./agents/fabys-reviewer.js";
import * as tdd from "./agents/fabys-tdd.js";
import * as testConsolidator from "./agents/fabys-test-consolidator.js";
import * as testEngineer from "./agents/fabys-test-engineer.js";

import * as devSkill from "./skills/dev.js";
import * as lintSkill from "./skills/lint.js";
import * as rapidSkill from "./skills/rapid.js";
import * as tddSkill from "./skills/tdd.js";
import * as testSkill from "./skills/test.js";

export const agents: TemplateEntry[] = [analyst, critic, explorer, implementer, planner, rapid, reviewer, tdd, testConsolidator, testEngineer];

export const skills: TemplateEntry[] = [devSkill, lintSkill, rapidSkill, tddSkill, testSkill];
