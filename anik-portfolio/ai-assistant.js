import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
const GENERATION_MODEL = 'google/flan-t5-large';
const STORAGE_MODE_KEY = 'anik-assistant-mode';
const STORAGE_TOKEN_KEY = 'anik-hf-token';

const KNOWLEDGE_BASE = [
    {
        title: 'Professional Summary',
        content: 'Anik Dasgupta is a Senior SDET and QA Automation Engineer with 9 years of experience across web, API, mobile, and desktop testing. He specializes in Python-based automation frameworks, Selenium, Playwright, Pytest, Pytest-BDD, CI/CD quality engineering, and AI-driven testing initiatives. He has domain experience in healthcare, BPM platforms, banking, and finance.'
    },
    {
        title: 'Hyland Experience',
        content: 'At Hyland Software since June 2022 as Test Engineer 3, Anik designed a CI-integrated automation framework for web, API, and legacy Windows desktop applications. He led UI and API automation using Selenium, Playwright, Pytest, and Postman. He extended desktop automation using Pywinauto and Pyautogui, improved Jenkins workflows for cross-platform regression, embedded SAST and SCA validation, mentored junior QA engineers, and contributed to AI-enhanced utilities for documentation parsing and test optimization.'
    },
    {
        title: 'OpenText Experience',
        content: 'At OpenText Technologies from March 2021 to June 2022, Anik automated regression suites for BPM, Case, and Decision products. He strengthened cross-browser, API, and database validation and improved CI/CD execution readiness and test data strategies for enterprise workflow products.'
    },
    {
        title: 'Cognizant Experience',
        content: 'At Cognizant Technology Solutions from December 2016 to March 2021, Anik built and maintained automation suites using Selenium Grid for banking and lending systems. He enhanced BDD frameworks using TestNG and Cucumber, automated hybrid browser and Windows desktop workflows using AutoIT with Selenium, and stabilized secure login and popup-driven flows.'
    },
    {
        title: 'Automation Skills',
        content: 'Anik works with Selenium, Playwright, Pytest, Pytest-BDD, Appium, Allure, Selenium Grid, TestNG, Cucumber, Postman, REST API automation, and database validation. He builds reusable, CI-ready automation frameworks with Python and also has Java and SQL proficiency.'
    },
    {
        title: 'Desktop Automation',
        content: 'Anik has strong desktop automation experience using Pywinauto, Pyautogui, and AutoIT. He used these tools to automate legacy Windows applications, secure popups, desktop validations, and hybrid workflows that combine browser and system-level interactions.'
    },
    {
        title: 'Security and DevOps',
        content: 'Anik integrates quality engineering into delivery pipelines using Jenkins, Git, Bitbucket, and Docker. He has experience with shift-left security practices including SAST, SCA, and OWASP-oriented validation inside release workflows.'
    },
    {
        title: 'AI-Driven Testing',
        content: 'Anik has contributed to AI-enhanced testing utilities that improve documentation parsing, reduce manual analysis effort, and support test optimization. His AI-driven testing positioning is pragmatic: he uses LLM and NLP techniques to improve prioritization, analysis throughput, and automation support rather than generating low-signal test noise.'
    },
    {
        title: 'Projects',
        content: 'Representative projects include a unified web, API, and desktop automation framework using Selenium, Playwright, Pytest, Pywinauto, and Pyautogui; a BPM regression modernization effort with browser, API, and backend validations; AI-driven testing utilities for documentation parsing and test targeting; and hybrid banking workflow automation using Selenium Grid, TestNG, Cucumber, and AutoIT.'
    },
    {
        title: 'Education and Certifications',
        content: 'Anik completed a Post Graduate Program in Artificial Intelligence and Machine Learning from Great Lakes Executive Learning and the University of Texas at Austin with an Excellent grade. He holds a B.Tech in Electrical Engineering from MAKAUT with DGPA 8.97. He also holds the NPTEL certification Programming, Data Structures and Algorithms Using Python.'
    },
    {
        title: 'Leadership and Hiring Fit',
        content: 'Anik is a strong fit for senior SDET and QA automation roles because he combines hands-on framework design, API and desktop automation depth, CI/CD integration, AI-driven testing initiatives, and mentoring experience. He leads test planning, defect triage, risk-based validation, and framework ownership rather than focusing on manual execution.'
    }
];

const state = {
    embedder: null,
    knowledgeVectors: [],
    isReady: false,
    isBusy: false,
    mode: 'local',
    hfToken: '',
    widgetOpen: false
};

const elements = {
    launcher: document.getElementById('assistantLauncher'),
    widget: document.getElementById('assistantWidget'),
    openButtons: Array.from(document.querySelectorAll('[data-assistant-open]')),
    closeButton: document.getElementById('assistantClose'),
    form: document.getElementById('assistantForm'),
    input: document.getElementById('assistantInput'),
    messages: document.getElementById('assistantMessages'),
    status: document.getElementById('assistantStatus'),
    suggestions: document.getElementById('assistantSuggestions'),
    modeSelect: document.getElementById('assistantMode'),
    tokenInput: document.getElementById('assistantToken'),
    saveButton: document.getElementById('assistantSaveToken'),
    modeBadge: document.getElementById('assistantModeBadge')
};

if (elements.form && elements.input && elements.messages && elements.status && elements.launcher && elements.widget) {
    initializeAssistant().catch((error) => {
        console.error('Recruiter assistant initialization failed:', error);
        setStatus('error', 'Model failed');
        appendBotMessage('The recruiter assistant could not load its Hugging Face model in this browser session. Refresh and try again.');
    });
}

async function initializeAssistant() {
    restoreSettings();
    bindFloatingControls();
    bindSettingsControls();
    wireSuggestionClicks();
    bindForm();
    updateModeBadge();
    openWidget();
    setStatus('loading', 'Downloading model...');

    state.embedder = await pipeline('feature-extraction', EMBEDDING_MODEL, {
        quantized: true,
        progress_callback: handleProgress
    });

    setStatus('loading', 'Indexing profile...');
    state.knowledgeVectors = await Promise.all(
        KNOWLEDGE_BASE.map(async (entry) => ({
            ...entry,
            embedding: await createEmbedding(entry.content)
        }))
    );

    state.isReady = true;
    setStatus('ready', 'Assistant ready');
    appendBotMessage('Recruiter assistant is ready. Ask about experience, frameworks, desktop automation, AI-driven testing, leadership scope, projects, or hiring fit.');
}

function restoreSettings() {
    state.mode = localStorage.getItem(STORAGE_MODE_KEY) || 'local';
    state.hfToken = localStorage.getItem(STORAGE_TOKEN_KEY) || '';

    if (elements.modeSelect) {
        elements.modeSelect.value = state.mode;
    }

    if (elements.tokenInput) {
        elements.tokenInput.value = state.hfToken;
    }
}

function bindFloatingControls() {
    elements.launcher.addEventListener('click', () => {
        if (state.widgetOpen) {
            closeWidget();
        } else {
            openWidget();
        }
    });

    elements.openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            openWidget();
            elements.input.focus();
        });
    });

    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', () => {
            closeWidget();
        });
    }
}

function bindSettingsControls() {
    if (elements.saveButton) {
        elements.saveButton.addEventListener('click', () => {
            state.mode = elements.modeSelect.value;
            state.hfToken = elements.tokenInput.value.trim();
            localStorage.setItem(STORAGE_MODE_KEY, state.mode);
            if (state.hfToken) {
                localStorage.setItem(STORAGE_TOKEN_KEY, state.hfToken);
            } else {
                localStorage.removeItem(STORAGE_TOKEN_KEY);
            }
            updateModeBadge();
            appendBotMessage(
                state.mode === 'live' && state.hfToken
                    ? 'Hosted Hugging Face answer mode saved. I will now use retrieval plus live generation when you ask a question.'
                    : 'Assistant settings saved. The assistant will continue in local semantic mode unless a Hugging Face token is provided.'
            );
        });
    }

    if (elements.modeSelect) {
        elements.modeSelect.addEventListener('change', () => {
            const pendingMode = elements.modeSelect.value;
            if (pendingMode === 'live' && !elements.tokenInput.value.trim()) {
                appendBotMessage('Hosted answer mode requires a Hugging Face access token. Save a token first or stay in local semantic mode.');
            }
        });
    }
}

function bindForm() {
    elements.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const question = elements.input.value.trim();
        if (!question || state.isBusy) {
            return;
        }
        await handleRecruiterQuestion(question);
    });
}

function wireSuggestionClicks() {
    if (!elements.suggestions) {
        return;
    }

    elements.suggestions.querySelectorAll('.assistant-chip').forEach((chip) => {
        chip.addEventListener('click', async () => {
            if (state.isBusy) {
                return;
            }
            const question = chip.textContent.trim();
            openWidget();
            elements.input.value = question;
            await handleRecruiterQuestion(question);
        });
    });
}

async function handleRecruiterQuestion(question) {
    if (!state.isReady) {
        appendBotMessage('The assistant is still loading its Hugging Face model. Wait a few seconds and try again.');
        return;
    }

    state.isBusy = true;
    setControlsDisabled(true);
    appendUserMessage(question);
    elements.input.value = '';
    setStatus('loading', state.mode === 'live' && state.hfToken ? 'Generating...' : 'Thinking...');

    try {
        const queryEmbedding = await createEmbedding(question);
        const rankedEntries = rankKnowledge(queryEmbedding).slice(0, 3);
        const localAnswer = buildLocalAnswer(question, rankedEntries);
        const finalAnswer = await maybeGenerateHostedAnswer(question, rankedEntries, localAnswer);
        appendBotMessage(finalAnswer);
        setStatus('ready', 'Assistant ready');
    } catch (error) {
        console.error('Recruiter assistant question failed:', error);
        appendBotMessage('I hit a problem while answering that question. Try rephrasing it, for example: “Summarize Hyland experience” or “What tools does Anik use for desktop automation?”');
        setStatus('error', 'Query failed');
    } finally {
        state.isBusy = false;
        setControlsDisabled(false);
    }
}

async function maybeGenerateHostedAnswer(question, rankedEntries, localAnswer) {
    if (state.mode !== 'live' || !state.hfToken) {
        return localAnswer;
    }

    try {
        const generated = await requestHostedAnswer(question, rankedEntries);
        if (!generated) {
            return localAnswer;
        }
        return generated;
    } catch (error) {
        console.error('Hosted Hugging Face generation failed, falling back to local answer:', error);
        appendBotMessage('Hosted answer mode was unavailable for this request, so I used the local semantic answer instead.');
        updateModeBadge('live unavailable');
        return localAnswer;
    }
}

async function requestHostedAnswer(question, rankedEntries) {
    const contextBlock = rankedEntries
        .map((entry, index) => `${index + 1}. ${entry.title}: ${entry.content}`)
        .join('\n');

    const prompt = [
        'You are a recruiter assistant for Anik Dasgupta.',
        'Answer using only the supplied profile context.',
        'Be concise, factual, and recruiter-friendly.',
        'If the question asks about fit, summarize strengths clearly.',
        '',
        `Question: ${question}`,
        '',
        'Profile context:',
        contextBlock,
        '',
        'Answer:'
    ].join('\n');

    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${GENERATION_MODEL}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${state.hfToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 220,
                temperature: 0.2,
                return_full_text: false
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Hosted generation failed with status ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data) && data[0] && data[0].generated_text) {
        return cleanHostedText(data[0].generated_text);
    }

    if (data && data.generated_text) {
        return cleanHostedText(data.generated_text);
    }

    return '';
}

function cleanHostedText(text) {
    return text.replace(/^Answer:\s*/i, '').trim();
}

async function createEmbedding(text) {
    const output = await state.embedder(text, {
        pooling: 'mean',
        normalize: true
    });

    return Array.from(output.data);
}

function rankKnowledge(queryEmbedding) {
    return state.knowledgeVectors
        .map((entry) => ({
            ...entry,
            score: cosineSimilarity(queryEmbedding, entry.embedding)
        }))
        .sort((left, right) => right.score - left.score);
}

function buildLocalAnswer(question, rankedEntries) {
    const topEntry = rankedEntries[0];
    const supportingEntries = rankedEntries.slice(1);

    if (!topEntry || topEntry.score < 0.18) {
        return 'I could not confidently match that question to the profile data. Try asking about Python automation, Playwright, Selenium, desktop automation, AI-driven testing, security testing, CI/CD integration, or experience at Hyland, OpenText, or Cognizant.';
    }

    const intro = inferIntro(question, topEntry.title);
    const primary = sanitizeSentenceBlock(topEntry.content);
    const support = supportingEntries
        .filter((entry) => entry.score > 0.12)
        .map((entry) => `Related context: ${sanitizeSentenceBlock(entry.content)}`)
        .slice(0, 2);

    return [intro, primary, ...support].join('\n\n');
}

function inferIntro(question, title) {
    const normalized = question.toLowerCase();

    if (normalized.includes('playwright') || normalized.includes('selenium') || normalized.includes('pytest')) {
        return 'Yes. Here is the most relevant automation experience:';
    }

    if (normalized.includes('desktop')) {
        return 'Yes. Here is the desktop automation summary:';
    }

    if (normalized.includes('ai')) {
        return 'Here is the strongest AI-driven testing summary:';
    }

    if (normalized.includes('security') || normalized.includes('owasp') || normalized.includes('sast') || normalized.includes('sca')) {
        return 'Here is the most relevant security-testing context:';
    }

    if (normalized.includes('why') || normalized.includes('fit') || normalized.includes('hire')) {
        return 'Here is the strongest hiring-fit summary:';
    }

    if (normalized.includes('project')) {
        return 'Here are the most relevant project highlights:';
    }

    return `Best match from ${title}:`;
}

function sanitizeSentenceBlock(text) {
    return text.replace(/\s+/g, ' ').trim();
}

function cosineSimilarity(left, right) {
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;

    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftNorm += left[index] * left[index];
        rightNorm += right[index] * right[index];
    }

    return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function appendUserMessage(text) {
    appendMessage(text, 'assistant-message-user');
}

function appendBotMessage(text) {
    appendMessage(text, 'assistant-message-bot');
}

function appendMessage(text, modifierClass) {
    const article = document.createElement('article');
    article.className = `assistant-message ${modifierClass}`;

    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    paragraphs.forEach((chunk) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = chunk;
        article.appendChild(paragraph);
    });

    elements.messages.appendChild(article);
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

function handleProgress(progress) {
    if (!progress || typeof progress.progress !== 'number') {
        return;
    }

    const percent = Math.max(0, Math.min(100, Math.round(progress.progress * 100)));
    setStatus('loading', `Loading ${percent}%`);
}

function setStatus(type, label) {
    elements.status.textContent = label;
    elements.status.className = 'assistant-status';
    if (type) {
        elements.status.classList.add(type);
    }
}

function setControlsDisabled(isDisabled) {
    elements.input.disabled = isDisabled;
    const submitButton = elements.form.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = isDisabled;
    }
    if (elements.suggestions) {
        elements.suggestions.querySelectorAll('.assistant-chip').forEach((chip) => {
            chip.disabled = isDisabled;
        });
    }
    if (elements.saveButton) {
        elements.saveButton.disabled = isDisabled;
    }
}

function openWidget() {
    state.widgetOpen = true;
    elements.widget.hidden = false;
    elements.launcher.setAttribute('aria-expanded', 'true');
    elements.launcher.textContent = 'Close AI Assistant';
}

function closeWidget() {
    state.widgetOpen = false;
    elements.widget.hidden = true;
    elements.launcher.setAttribute('aria-expanded', 'false');
    elements.launcher.textContent = 'AI Recruiter Assistant';
}

function updateModeBadge(overrideLabel) {
    if (!elements.modeBadge) {
        return;
    }

    if (overrideLabel) {
        elements.modeBadge.textContent = overrideLabel;
        return;
    }

    if (state.mode === 'live' && state.hfToken) {
        elements.modeBadge.textContent = 'Hosted HF mode';
    } else if (state.mode === 'live' && !state.hfToken) {
        elements.modeBadge.textContent = 'Live mode needs token';
    } else {
        elements.modeBadge.textContent = 'Local mode';
    }
}
