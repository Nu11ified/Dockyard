#!/usr/bin/env bun
import { createCli } from "./cli/index";

const program = createCli();
program.parse();
