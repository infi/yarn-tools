export interface Class {
    obfuscated: string;
    yarn: string;
    fields: Field[];
    methods: Method[];
    subClasses: Class[];
    comment: string;
}

export interface Field {
    obfuscated: string;
    yarn: string;
    type: string;
    comment: null | string;
}

export interface Method {
    obfuscated: string;
    yarn: string;
    signature?: string;
    args: Arg[];
    comment: null | string;
}

export interface Arg {
    position: number;
    yarn: string;
    comment: null | string;
}

function parseDescriptor(descriptor: string): string {
    switch (descriptor.charAt(0)) {
        case "B":
            return "number";
        case "C":
            return "string";
        case "D":
            return "number";
        case "F":
            return "number";
        case "I":
            return "number";
        case "J":
            return "number";
        case "S":
            return "number";
        case "Z":
            return "boolean";
        case "V":
            return "void";
        case "L":
            if (descriptor === "Ljava/lang/String;") {
                return "string";
            }
            return "any";
        case "[":
            return "any[]";
    }
    return "any";
}

const numbersAsWord = (num: number) => {
    const digits = num.toString().split("");
    return digits.map((digit) => {
        switch (digit) {
            case "0":
                return "Zero";
            case "1":
                return "One";
            case "2":
                return "Two";
            case "3":
                return "Three";
            case "4":
                return "Four";
            case "5":
                return "Five";
            case "6":
                return "Six";
            case "7":
                return "Seven";
            case "8":
                return "Eight";
            case "9":
                return "Nine";
        }
    }).join("");
};

export function generateTypeDeclarations(cls: Class): string {
    let output = "";

    // Generate class declaration
    output += `/**\n * ${
        cls.comment ?? ""
    }\n * @obfuscated ${cls.obfuscated}\n */\n`;

    if (!cls.yarn) {
        output += `declare class ${
            numbersAsWord(parseInt(cls.obfuscated))
        } {\n`;
    } else {
        output += `declare class ${cls.yarn.split("/").pop()} {\n`;
    }

    // Generate fields
    for (const field of cls.fields) {
        output += `    /**\n     * ${
            field.comment ?? ""
        }\n     * @obfuscated ${field.obfuscated}\n     */\n`;
        if (field.type === undefined) {
            // It's a bit messed up then, ooops
            const fieldType = parseDescriptor(field.yarn);
            output += `    ${field.obfuscated}: ${fieldType};\n`;
        } else {
            const fieldType = parseDescriptor(field.type);
            output += `    ${field.yarn}: ${fieldType};\n`;
        }
    }

    // Generate methods
    for (const method of cls.methods) {
        output += `    /**\n     * ${
            method.comment ?? ""
        }\n     * @obfuscated ${method.obfuscated}\n     */\n`;

        // Prepare method arguments
        const params = [];
        let expectedPosition = 0;
        for (const arg of method.args) {
            while (expectedPosition < arg.position) {
                params.push(`arg${expectedPosition}: any`);
                expectedPosition++;
            }
            const argName = arg.yarn || `arg${arg.position}`;
            params.push(`${argName}: any`);
            expectedPosition++;
        }

        // Handle possible remaining positions
        // ...existing code...

        const returnType = parseDescriptor(
            (method.signature?.split(")") ?? [])[1] ?? "V",
        );
        let methodName = method.yarn;

        // If method has same name as a field
        if (cls.fields.some((field) => field.yarn === methodName)) {
            methodName += "_Method";
        }

        if (methodName === "<init>") {
            methodName = "constructor";
            output += `    ${methodName}(${params.join(", ")});\n`;
        } else {
            output += `    ${methodName}(${
                params.join(", ")
            }): ${returnType};\n`;
        }
    }

    output += "}\n";

    // Generate sub classes
    for (const subClass of cls.subClasses) {
        output += generateTypeDeclarations(subClass);
    }

    return output;
}

if (import.meta.main) {
    const { parseArgs } = await import("jsr:@std/cli/parse-args");
    const args = parseArgs(Deno.args);
    const file = JSON.parse(
        Deno.readTextFileSync(args.file),
    ) as Class;
    const output = generateTypeDeclarations(file);
    Deno.writeTextFileSync(args.output, output);
}
