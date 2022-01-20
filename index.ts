import { TelegramClient } from 'telegram'
import { StringSession }  from 'telegram/sessions'
import input from 'input'; // npm i input
import { Dialog } from 'telegram/tl/custom/dialog';
import 'dotenv/config';
import {readFile, writeFile} from 'fs';

// const apiId = parseInt(process.env.API_ID);
// const apiHash = process.env.API_HASH;
// const stringSession = new StringSession("1BQANOTEuMTA4LjU2LjEzNQG7mXYh7PotfYQReOyMRoQdROs6uWZ1LRsTibfLaY4Jlg5rOVg9fP+m3XPI6AsFEmQ/j4OEjjiMxJP4UFhTSeVj7RQ5daGLZJNBWqpITCwxTxxYEXG+DHqQd/trgpdkGpuH3q+NQWp6JGtpmYuhHassbB3QJiX3iKqX2ak6tGu+RZIFPyjqlK3mmI5e3xbSYr6E38pIPSXXQKMY474bxBYmqqo6mH9410t7wNTyfqXWs8FryGhHqNQpFQaGC02fRfgc5beT1uPy4Tj7PSsoeiOsNOL2qMYohwxn4feN5ysnQjV4qdaxio26htS3+/UJ7YZZb0O2W+nTACvIyvXaRq2vSg=="); // fill this later with the value from session.save()
// const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

let lastMessageId: number = null;

const getAuth = async () => {
    return new Promise<StringSession>((resolve, reject) => {
        readFile('config.json', 'utf8', (err, v) => {
            if (err) {
                resolve(new StringSession(""));
            }else {
                const auth = JSON.parse(v);
                if ('token' in auth) {
                    resolve(new StringSession(auth.token));
                }else {
                    resolve(new StringSession(""));
                }
            }
        })
    });
}

const writeAuth = async (data: string) => {
    return new Promise<boolean>((resolve, reject) => {
        writeFile('config.json', data, 'utf8', (err) => {
            if (err) {
                console.error(err);
                return process.exit(1);
            }
            resolve(true);
        });
    });
}

const initUser = async () => {
    const apiId = parseInt(process.env.API_ID);
    const apiHash = process.env.API_HASH;
    const stringSession = await getAuth();
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
    await client.start({
        phoneNumber: async () => await input.text('number ?'),
        password: async () => await input.text('password?'),
        phoneCode: async () => await input.text('Code ?'),
        onError: (err) => console.log(err),
    });
    return client;
}

const startMessage = async (client: TelegramClient) => {
    console.clear();
    console.log("--------------------------------------------------------------------------------------")
    console.log('You should now be connected.');
    console.log("--------------------------------------------------------------------------------------");

    const dialogList = await client.getDialogs({});
    dialogList.forEach((v, index) => {
        console.log(`[${index + 1}] ${v.name} | ${v.unreadCount} Message`);
    });
    console.log(`\n[0] Refresh Dialog List`);
    const inputCmd: any = await input.text("Nomor :", {
        validate(txt) {
            if (isNaN(txt)) return "Wrong number!";
            return true;
        }
    });

    const index = parseInt(inputCmd) - 1;
    if (inputCmd === '0') {
        startMessage(client);
    }else if (index > dialogList.length) {
        console.error("Wrong Number, wait 2 Second for refresh...");
        setTimeout(() => {
            startMessage(client);
        }, 2000);
    }else {
        const peer = dialogList[index];
        renewMessage(client, peer);
    }
}

const renewMessage = async (client: TelegramClient, dialog: Dialog) => {
    console.clear();
    console.log("--------------------------------------------------------------------------------------")
    console.log("START");
    console.log("--------------------------------------------------------------------------------------");
    
    const messages = await client.getMessages(dialog.id, {
        limit: 20,
    });
    const data = messages.reverse();
    lastMessageId = data[data.length-1].id;
    data.forEach((v) => {
        let detailMessage = '';

        if (v.replyTo !== null) {
            detailMessage += `Reply: ${v.replyToMsgId}\n`;1
        }


        if (v.out) {
            detailMessage += `${v.id}${v.replyTo !== null ? ` => ${v.replyToMsgId}`:''} | [${v.date}] [Me] => ${v.message}`;
        }else {
            detailMessage += `${v.id}${v.replyTo !== null ? ` => ${v.replyToMsgId}`:''} | [] [${dialog.name}] => ${v.message}`;
        }
        console.info(`${detailMessage}`);
    });
    menuChat(client, dialog);
}

const chatPeer = async (client: TelegramClient, dialog: Dialog, reply: boolean = false) => {
    if (reply) {
        const messageID: string = await input.text(`Input Message ID :`, {
            validate(txt) {
                if (isNaN(txt)) return "Wrong number!";
                return true;
            }
        });
        const message: string = await input.text(`Message :`);
        await client.sendMessage(dialog.id, {
            replyTo: parseInt(messageID),
            message
        });
        renewMessage(client, dialog);
    }else {
        const message: string = await input.text(`Message :`);
        await client.sendMessage(dialog.id, {message});
        renewMessage(client, dialog);
    }


}

const menuChat = async (client: TelegramClient, dialog: Dialog) => {
    console.log("--------------------------------------------------------------------------------------");
    console.log("1. Send Message");
    console.log("2. Reply");
    console.log("3. Refresh");
    console.log("0. Quit");
    const inputCmd: String = await input.text('Select Number :', {
        validate(txt) {
            if (isNaN(txt)) return "Wrong number!";
            return true;
        }
    });
    switch (inputCmd) {
        case '1':
            chatPeer(client, dialog);
            break;
        case '2':
            chatPeer(client, dialog, true);
            break;
        case '3':
            renewMessage(client, dialog);
            break;
        case '0':
            startMessage(client);
            break;
    
        default:
            renewMessage(client, dialog);
            break;
    }
}


(async () => {
    const client = await initUser()
    startMessage(client);
})()
