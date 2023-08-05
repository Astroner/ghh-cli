import { createHook } from "@dogonis/github-hook";

import { chalk } from "../chalk";

const boot = async () => {
    if(!process.env.CONFIG) throw new Error("CONFIG env is not provided");
    if(!process.env.PORT) throw new Error("PORT env is not provided");

    const port = +process.env.PORT;
    const config = JSON.parse(process.env.CONFIG);

    const hook = createHook(config)

    return await hook.start(port);
}

void boot()
    .then((addr) => {
        console.log(chalk.green(`Wing launched`))
        console.log(chalk.green(`  Port: ${addr.port}`))
        console.log(chalk.green(`   PID: ${process.pid}`))

        process.send && process.send({
            type: "STARTED",
            port: addr.port,
            pid: process.pid
        })
    })
    .catch((err) => {
        console.log(chalk.red(`Failed to launch the wing:`))
        console.log(chalk.red(err + ""))

        process.send && process.send({
            type: "FAILURE",
            error: err + ""
        })
    })