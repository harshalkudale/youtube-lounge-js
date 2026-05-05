import readline from 'node:readline';

export async function* asAiter(iterator) {
    for (const item of iterator) {
        yield item;
    }
}

export async function* iterResponseLines(response) {
    // response is a fetch Response with a readable body
    const body = response.body;
    if (!body) return;
    const rl = readline.createInterface({ input: body });
    try {
        for await (const line of rl) {
            yield `${line}\n`;
        }
    } finally {
        rl.close();
    }
}
