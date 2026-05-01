export type Tool = "copilot" | "opencode" | "claude";

export interface TemplateRenderContext {
  models?: Readonly<Record<string, string>>;
}

export interface TemplateEntry {
  relativePath: string;
  render: (tool: Tool, context?: TemplateRenderContext) => string;
}

import * as analyst from "./agents/fabys-analyst.js";
import * as critic from "./agents/fabys-critic.js";
import * as explorer from "./agents/fabys-explorer.js";
import * as impl from "./agents/fabys-impl.js";
import * as implementer from "./agents/fabys-implementer.js";
import * as planner from "./agents/fabys-planner.js";
import * as rapid from "./agents/fabys-rapid.js";
import * as reviewer from "./agents/fabys-reviewer.js";
import * as tdd from "./agents/fabys-tdd.js";
import * as testConsolidator from "./agents/fabys-test-consolidator.js";
import * as testEngineer from "./agents/fabys-test-engineer.js";

import * as fabysExplorationSkill from "./skills/fabys-exploration.js";
import * as fabysQuestionsSkill from "./skills/fabys-questions.js";
import * as devSkill from "./skills/dev.js";
import * as explorationSkill from "./skills/exploration.js";
import * as implSkill from "./skills/impl.js";
import * as implementationSkill from "./skills/implementation.js";
import * as lintSkill from "./skills/lint.js";
import * as planningSkill from "./skills/planning.js";
import * as rapidSkill from "./skills/rapid.js";
import * as reviewSkill from "./skills/review.js";
import * as tddSkill from "./skills/tdd.js";
import * as testConsolidationSkill from "./skills/test-consolidation.js";
import * as testEngineeringSkill from "./skills/test-engineering.js";
import * as testSkill from "./skills/test.js";

export const agents: TemplateEntry[] = [critic, explorer, impl, implementer, planner, rapid, reviewer, tdd, testConsolidator, testEngineer];

export const allAgents: TemplateEntry[] = [analyst, ...agents];

export const skills: TemplateEntry[] = [
  fabysExplorationSkill,
  fabysQuestionsSkill,
  devSkill,
  implSkill,
  explorationSkill,
  implementationSkill,
  lintSkill,
  planningSkill,
  rapidSkill,
  reviewSkill,
  tddSkill,
  testConsolidationSkill,
  testEngineeringSkill,
  testSkill
];
