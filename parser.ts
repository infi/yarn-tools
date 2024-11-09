type Classy = {
    obfuscated: string | null;
    yarn: string | null;
    fields: Fieldy[];
    methods: Methody[];
    subClasses: Classy[];
    comment: string | null;
};
type Fieldy = {
    obfuscated: string | null;
    yarn: string | null;
    type: string | null;
    comment: string | null;
};
type Methody = {
    obfuscated: string | null;
    yarn: string | null;
    signature: string | null;
    args: Argy[];
    comment: string | null;
};
type Argy = {
    position: number | null;
    yarn: string | null;
    comment: string | null;
};

const freshClass = () => {
    return {
        obfuscated: null,
        yarn: null,
        fields: [],
        methods: [],
        subClasses: [],
        comment: null,
    } as Classy;
};
const freshField = () => {
    return {
        obfuscated: null,
        yarn: null,
        type: null,
        comment: null,
    } as Fieldy;
};
const freshMethod = () => {
    return {
        obfuscated: null,
        yarn: null,
        signature: null,
        args: [],
        comment: null,
    } as Methody;
};

export const parseYarnMappings = (sourcefile: string) => {
    let currentClass: Classy = freshClass();
    let currentField: Fieldy = freshField();
    let currentMethod: Methody = freshMethod();
    let classStack: Classy[] = [currentClass];
    let isIn: "class" | "field" | "method" = "class";

    for (const line of sourcefile.split("\n")) {
        if (line.startsWith("CLASS ")) {
            isIn = "class";
            const [, obfuscated, yarn] = line.split(" ");
            currentClass = freshClass();
            currentClass.obfuscated = obfuscated;
            currentClass.yarn = yarn;
            if (!currentClass.yarn) {
                currentClass.yarn = currentClass.obfuscated;
            }
            classStack = [currentClass];
        }
        if (line.startsWith("\tCLASS ")) {
            isIn = "class";
            const subClass = freshClass();
            const [, obfuscated, yarn] = line.split(" ");
            subClass.obfuscated = obfuscated;
            subClass.yarn = yarn;
            classStack[classStack.length - 1].subClasses.push(subClass);
            classStack.push(subClass);
            currentClass = subClass;
        }
        if (line.startsWith("\tCOMMENT ")) {
            if (currentClass.comment === null) currentClass.comment = "";
            currentClass.comment += line.split(" ").slice(1).join(" ") + " ";
        }
        if (line.startsWith("\tFIELD ")) {
            isIn = "field";
            const [, obfuscated, yarn, type] = line.split(" ");
            currentField = freshField();
            currentField.obfuscated = obfuscated;
            currentField.yarn = yarn;
            currentField.type = type;
            currentClass.fields.push(currentField);
        }
        if (line.startsWith("\tMETHOD ")) {
            isIn = "method";
            if (line.includes("<init>")) {
                const [, init, signature] = line.split(" ");
                currentMethod = freshMethod();
                currentMethod.obfuscated = init;
                currentMethod.yarn = init;
                currentMethod.signature = signature;
                currentClass.methods.push(currentMethod);
                continue;
            }

            const [, obfuscated, yarn, signature] = line.split(" ");
            currentMethod = freshMethod();
            currentMethod.obfuscated = obfuscated;
            currentMethod.yarn = yarn;
            currentMethod.signature = signature;
            if (currentMethod.yarn.startsWith("(")) {
                [currentMethod.signature, currentMethod.yarn] = [
                    currentMethod.yarn,
                    currentMethod.obfuscated,
                ];
            }
            currentClass.methods.push(currentMethod);
        }
        if (line.startsWith("\t\tCOMMENT ")) {
            switch (isIn) {
                case "field":
                    if (currentField.comment === null) {
                        currentField.comment = "";
                    }
                    currentField.comment += line.split(" ").slice(1).join(" ") +
                        " ";
                    break;
                case "method":
                    if (currentMethod.comment === null) {
                        currentMethod.comment = "";
                    }
                    currentMethod.comment +=
                        line.split(" ").slice(1).join(" ") +
                        " ";
                    break;
                case "class":
                    if (currentClass.comment === null) {
                        currentClass.comment = "";
                    }
                    currentClass.comment += line.split(" ").slice(1).join(" ") +
                        " ";
                    break;
            }
        }
        if (line.startsWith("\t\tARG ")) {
            const [, position, yarn] = line.split(" ");
            const arg = { position: parseInt(position), yarn, comment: null };
            currentMethod.args.push(arg);
        }
        if (line.startsWith("\t\tFIELD ")) {
            const [, obfuscated, yarn, type] = line.split(" ");
            const field = freshField();
            field.obfuscated = obfuscated;
            field.yarn = yarn;
            field.type = type;
            currentClass.fields.push(field);
        }
        if (line.startsWith("\t\tMETHOD ")) {
            if (line.includes("<init>")) {
                const [, init, signature] = line.split(" ");
                const method = freshMethod();
                method.obfuscated = init;
                method.yarn = init;
                method.signature = signature;
                currentClass.methods.push(method);
                continue;
            }

            const [, obfuscated, yarn, signature] = line.split(" ");
            const method = freshMethod();
            method.obfuscated = obfuscated;
            method.yarn = yarn;
            method.signature = signature;
            currentClass.methods.push(method);
        }
        if (line.startsWith("\t\t\tARG ")) {
            const [, position, yarn] = line.split(" ");
            const arg = { position: parseInt(position), yarn, comment: null };
            currentMethod.args.push(arg);
        }
    }

    return classStack[0];
};

if (import.meta.main) {
    const { parseArgs } = await import("jsr:@std/cli/parse-args");
    const args = parseArgs(Deno.args);
    if (!args.file) throw new Error("No file specified");
    if (!args.output) throw new Error("No output specified");
    const sourcefile = Deno.readTextFileSync(args.file);
    const parsed = parseYarnMappings(sourcefile);
    const output = JSON.stringify(parsed, null, 4);
    Deno.writeTextFileSync(args.output, output);
}
