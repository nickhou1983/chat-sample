import { chown } from 'fs';
import { devNull } from 'os';
import * as vscode from 'vscode';
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const fetch = require('node-fetch');
import { renderPrompt } from '@vscode/prompt-tsx';


const CAT_NAMES_COMMAND_ID = 'cat.namesInEditor';
const CAT_PARTICIPANT_ID = 'chat-sample.cat';
const endpoint = 'https://demogptue.openai.azure.com/';
const azureApiKey = '3d3586abc879406e9cc40c6f7aa69bde';

interface ICatChatResult extends vscode.ChatResult {
    metadata: {
        command: string;
    }
}

const LANGUAGE_MODEL_ID = 'copilot-gpt-3.5-turbo'; // Use faster model. Alternative is 'copilot-gpt-4', which is slower but more powerful

export function activate(context: vscode.ExtensionContext) {

    // Define a Cat chat handler. 
    const handler: vscode.ChatRequestHandler = async (request: vscode.ChatRequest, context: vscode.ChatContext, stream: vscode.ChatResponseStream, token: vscode.CancellationToken): Promise<ICatChatResult> => {
        //　第一个判断是判断是否是teach命令，如果是teach命令，就调用Azure openai的接口，返回结果
        if (request.command == 'teach') {
            stream.progress('让我思考一下如何回复您的问题...');
            const openai = new OpenAIClient(
                endpoint,
                new AzureKeyCredential(azureApiKey)
            );
            // 构造消息
            const messages = [
                { role: "system", content: "You are a teacher. You will talk like a teacher." },
                { role: "user", content: request.prompt },
            //    { role: "assistant", content: "Arrrr! Of course, me hearty! What can I do for ye?" },
            //    { role: "user", content: "What's the best way to train a parrot?" },
            ];
            const deploymentName = 'demogpt4o';
            // 调用openai的接口
            const result  = await openai.getChatCompletions(deploymentName, messages, {
                maxTokens: 500,
                temperature: 0.25
                });    
            // 输出结果
            for await (const choice of result.choices) {
                console.log(choice.message.content);
                stream.markdown(`${choice.message.content}`);
                };
            return { metadata: { command: 'teach' } };
         

        } else if (request.command == 'kb') {
            stream.progress('让我查询一下文档');
            const apiUrl = 'https://api.dify.ai/v1/chat-messages';
            const apiKey = 'app-DLTtgVeLAkIQurhOAVMWkEMu'; // Replace with actual API key
            let result = '';
            const requestBody = {
                inputs: {},
                query: request.prompt,
                //response_mode: "streaming",
                response_mode: "blocking",
                conversation_id: "",
                user: "abc-123"
            };
            try {
                //const fetch = require('node-fetch');
               
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });


                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json(); // Parse JSON response
                    //stream.markdown(`Response: ${JSON.stringify(data)}`);
                    stream.markdown(`${data.answer}`);

                } else if (contentType && contentType.includes('text/event-stream')) {
                    const decoder = new TextDecoder('utf-8');
                    let buffer = '';
                    
                    response.body.on('data', (chunk: Buffer) => {
                        buffer += decoder.decode(chunk, { stream: true });
            
                        let boundaryIndex;
                        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
                            const chunk = buffer.slice(0, boundaryIndex).trim();
                            buffer = buffer.slice(boundaryIndex + 2);
                            console.log(chunk);
                            if (chunk.startsWith('data:')) {
                                const data = chunk.slice(5).trim(); // Remove 'data:' prefix
                                try {
                                    const parsedData = JSON.parse(data);
                                    console.log(`Response: ${JSON.stringify(parsedData)}`);
                                    //如果存在answer的属性，就输出answer的内容，如果不存在就跳过
                                    if (parsedData.thought !== undefined && parsedData.thought !== "") {
                                        console.log("answer:------"+parsedData.thought);
                                        result = parsedData.thought;
                                    }

                                
                                } catch (e) {
                                    console.error(e);
                                    stream.markdown(`Error parsing JSON: ${(e as Error).message}`);
                                }
                            }
                        }
                    });


                    response.body.on('end', () => {
                        console.log('Response stream has ended.');                     
                        
                    });
                    console.log(result);
                    if (result) {
                        stream.markdown(result);
                    }
                } else {
                    const text = await response.text(); // Get raw response text
                    stream.markdown(`Unexpected content type: ${contentType}. Raw response: ${text}`);
                }

                
                                 
            } catch(err) {
               // handleError(err, stream);
            }


            return { metadata: { command: 'kb' } };
        } else if (request.command == 'sql') {
            stream.progress('让我思考一下如何回复您的问题...');
            const apiUrl = 'https://api.dify.ai/v1/completion-messages';
            const apiKey = 'app-Fw0pYoO6VrKaZp7VWBRaVlXl'; // Replace with actual API key
            let result = '';
            const requestBody = {
                inputs: {"default_input": request.prompt},            
                response_mode: "blocking",
                user: "abc-123"
            };
            try {
                //const fetch = require('node-fetch');
               
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });


                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json(); // Parse JSON response
                    //stream.markdown(`Response: ${JSON.stringify(data)}`);
                    stream.markdown(`${data.answer}`);

                } else if (contentType && contentType.includes('text/event-stream')) {
                    const decoder = new TextDecoder('utf-8');
                    let buffer = '';
                    
                    response.body.on('data', (chunk: Buffer) => {
                        buffer += decoder.decode(chunk, { stream: true });
            
                        let boundaryIndex;
                        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
                            const chunk = buffer.slice(0, boundaryIndex).trim();
                            buffer = buffer.slice(boundaryIndex + 2);
                            console.log(chunk);
                            if (chunk.startsWith('data:')) {
                                const data = chunk.slice(5).trim(); // Remove 'data:' prefix
                                try {
                                    const parsedData = JSON.parse(data);
                                    console.log(`Response: ${JSON.stringify(parsedData)}`);
                                    //如果存在answer的属性，就输出answer的内容，如果不存在就跳过
                                    if (parsedData.thought !== undefined && parsedData.thought !== "") {
                                        console.log("answer:------"+parsedData.thought);
                                        result = parsedData.thought;
                                    }

                                
                                } catch (e) {
                                    console.error(e);
                                    stream.markdown(`Error parsing JSON: ${(e as Error).message}`);
                                }
                            }
                        }
                    });


                    response.body.on('end', () => {
                        console.log('Response stream has ended.');                     
                        
                    });
                    console.log(result);
                    if (result) {
                        stream.markdown(result);
                    }
                } else {
                    const text = await response.text(); // Get raw response text
                    stream.markdown(`Unexpected content type: ${contentType}. Raw response: ${text}`);
                }                               
            } catch(err) {
               // handleError(err, stream);
            }
            return { metadata: { command: 'sql' } };

        // 第二个判断是判断是否是gencode命令，如果是gencode命令，就调用copilot的接口，返回结果
        } else if (request.command == 'gencode') {
            // To talk to an LLM in your subcommand handler implementation, your
            // extension can use VS Code's `requestChatAccess` API to access the Copilot API.
            // The GitHub Copilot Chat extension implements this provider.
            stream.progress('让我思考下如何生成代码...');
            const topic = getTopic(context.history);
            const messages = [
                new vscode.LanguageModelChatSystemMessage('You are a developer, When replying to a question, the code must be included.'),
                new vscode.LanguageModelChatUserMessage(topic)
            ];
            console.log('messages:', messages);
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                stream.markdown(fragment);
            }
            return { metadata: { command: 'gencode' } };
        } else if (request.command == 'play') {
            stream.progress('Throwing away the computer science books and preparing to play with some Python code...');
            const messages = [
                new vscode.LanguageModelChatSystemMessage('You are a cat! Reply in the voice of a cat, using cat analogies when appropriate. Be concise to prepare for cat play time.'),
                new vscode.LanguageModelChatUserMessage('Give a small random python code samples (that have cat names for variables). ' + request.prompt)
            ];
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                stream.markdown(fragment);
            }
            return { metadata: { command: 'play' } };
        } else if (request.command == 'genimage') {
            stream.progress('让我考虑一下如何生成图片...');
            const client = new OpenAIClient(
                endpoint,
                new AzureKeyCredential(azureApiKey)
            );
            const deploymentName = 'Dalle3';
            const prompt = request.prompt;
            const n = 1;
            const size = '1024x1024';
            const results = await client.getImages(deploymentName, prompt, { n, size });
            for (const image of results.data) {
                console.log(`Image generation result URL: ${image.url}`);
                stream.markdown(`![生成的图片](${image.url})`);
                };
            return { metadata: { command: 'genimage' } };
                

        } else {
            const messages = [
                new vscode.LanguageModelChatSystemMessage(`You are a cat! Think carefully and step by step like a cat would.
                    Your job is to explain computer science concepts in the funny manner of a cat, using cat metaphors. Always start your response by stating what concept you are explaining. Always include code samples.`),
                new vscode.LanguageModelChatUserMessage(request.prompt)
            ];
            const chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, token);
            for await (const fragment of chatResponse.stream) {
                // Process the output from the language model
                // Replace all python function definitions with cat sounds to make the user stop looking at the code and start playing with the cat
                const catFragment = fragment.replaceAll('def', 'meow');
                stream.markdown(catFragment);
            }

            return { metadata: { command: '' } };
        }
    };

    // Chat participants appear as top-level options in the chat input
    // when you type `@`, and can contribute sub-commands in the chat input
    // that appear when you type `/`.
    const cat = vscode.chat.createChatParticipant(CAT_PARTICIPANT_ID, handler);
    cat.iconPath = vscode.Uri.joinPath(context.extensionUri, 'qifeng.jpg');
    cat.followupProvider = {
        provideFollowups(result: ICatChatResult, context: vscode.ChatContext, token: vscode.CancellationToken) {
            return [{
                prompt: 'let us play',
                label: vscode.l10n.t('Play with the cat'),
                command: 'play'
            } satisfies vscode.ChatFollowup];
        }
    };

    vscode.chat.registerChatVariableResolver('cat_context', 'Describes the state of mind and version of the cat', {
        resolve: (name, context, token) => {
            if (name == 'cat_context') {
                const mood = Math.random() > 0.5 ? 'happy' : 'grumpy';
                return [
                    {
                        level: vscode.ChatVariableLevel.Short,
                        value: 'version 1.3 ' + mood
                    },
                    {
                        level: vscode.ChatVariableLevel.Medium,
                        value: 'I am a playful cat, version 1.3, and I am ' + mood
                    },
                    {
                        level: vscode.ChatVariableLevel.Full,
                        value: 'I am a playful cat, version 1.3, this version prefer to explain everything using mouse and tail metaphores. I am ' + mood
                    }
                ]
            }
        }
    });

    context.subscriptions.push(
        cat,
        // Register the command handler for the /meow followup
        vscode.commands.registerTextEditorCommand(CAT_NAMES_COMMAND_ID, async (textEditor: vscode.TextEditor) => {
            // Replace all variables in active editor with cat names and words
            const text = textEditor.document.getText();
            const messages = [
                new vscode.LanguageModelChatSystemMessage(`You are a cat! Think carefully and step by step like a cat would.
                Your job is to replace all variable names in the following code with funny cat variable names. Be creative. IMPORTANT respond just with code. Do not use markdown!`),
                new vscode.LanguageModelChatUserMessage(text)
            ];

            let chatResponse: vscode.LanguageModelChatResponse | undefined;
            try {
                chatResponse = await vscode.lm.sendChatRequest(LANGUAGE_MODEL_ID, messages, {}, new vscode.CancellationTokenSource().token);

            } catch (err) {
                // making the chat request might fail because
                // - model does not exist
                // - user consent not given
                // - quote limits exceeded
                if (err instanceof vscode.LanguageModelError) {
                    console.log(err.message, err.code, err.cause)
                }
                return
            }

            // Clear the editor content before inserting new content
            await textEditor.edit(edit => {
                const start = new vscode.Position(0, 0);
                const end = new vscode.Position(textEditor.document.lineCount - 1, textEditor.document.lineAt(textEditor.document.lineCount - 1).text.length);
                edit.delete(new vscode.Range(start, end));
            });

            // Stream the code into the editor as it is coming in from the Language Model
            try {
                for await (const fragment of chatResponse.stream) {
                    await textEditor.edit(edit => {
                        const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
                        const position = new vscode.Position(lastLine.lineNumber, lastLine.text.length);
                        edit.insert(position, fragment);
                    });
                }
            } catch (err) {
                // async response stream may fail, e.g network interruption or server side error
                await textEditor.edit(edit => {
                    const lastLine = textEditor.document.lineAt(textEditor.document.lineCount - 1);
                    const position = new vscode.Position(lastLine.lineNumber, lastLine.text.length);
                    edit.insert(position, (<Error>err).message);
                });
            }
        }),
    );
}

// Get a random topic that the cat has not taught in the chat history yet
function getTopic(history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>): string {
    const topics = ['linked list', 'recursion', 'stack', 'queue', 'pointers'];
    // Filter the chat history to get only the responses from the cat
    const previousCatResponses = history.filter(h => {
        return h instanceof vscode.ChatResponseTurn && h.participant == CAT_PARTICIPANT_ID
    }) as vscode.ChatResponseTurn[];
    // Filter the topics to get only the topics that have not been taught by the cat yet
    const topicsNoRepetition = topics.filter(topic => {
        return !previousCatResponses.some(catResponse => {
            return catResponse.response.some(r => {
                return r instanceof vscode.ChatResponseMarkdownPart && r.value.value.includes(topic)
            });
        });
    });

    return topicsNoRepetition[Math.floor(Math.random() * topicsNoRepetition.length)] || 'I have taught you everything I know. Meow!';
}

export function deactivate() { }
