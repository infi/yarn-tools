import { join } from "jsr:@std/path";
import { generateTypeDeclarations } from "./gentypings.ts";
import { parseYarnMappings } from "./parser.ts";

let hyperfile = "";

async function traverseDirectory(dir: string) {
    for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        if (entry.isDirectory) {
            await traverseDirectory(fullPath);
        } else if (entry.isFile) {
            const content = await Deno.readTextFile(fullPath);
            doSomethingWithContent(content, fullPath);
        }
    }
}

function doSomethingWithContent(content: string, filePath: string) {
    console.log(`Processing`, filePath);
    try {
        const parsed = parseYarnMappings(content);
        try {
            const generated = generateTypeDeclarations(parsed as any);
            hyperfile += generated;
        } catch (e) {
            console.error(
                `Failed to generate typings for`,
                filePath,
                "with content written to error.mappings.json",
            );
            Deno.writeTextFile(
                "error.mappings.json",
                JSON.stringify(parsed, null, 4),
            );
            console.error(e);
            Deno.exit(1);
        }
    } catch (e) {
        console.error(
            `Failed to parse`,
            filePath,
            "with content written to error.mappings",
        );
        Deno.writeTextFile("error.mappings", content);
        console.error(e);
        Deno.exit(1);
    }
}

// Start traversal from the desired directory
const startDir = join(Deno.cwd(), "yarn", "mappings");
await traverseDirectory(startDir);

Deno.writeTextFile("Minecraft.d.ts", hyperfile);
