import { fileURLToPath } from "node:url";
import { generateSpecification } from "./generate.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const result = await generateSpecification(repositoryRoot);

console.log(`Generated ${result.files.length} files from ${result.clauseCount} Clauses.`);
