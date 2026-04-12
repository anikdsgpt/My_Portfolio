import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;

env.remoteHost = 'https://huggingface.co';

env.remotePathTemplate = '{model}/resolve/{revision}/';

const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

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
    isBusy: false
};

const elements = {
    form: document.getElementById('assistantForm'),
    input: document.getElementById('assistantInput'),
    messages: document.getElementById('assistantMessages'),
    status: document.getElementById('assistantStatus'),
    suggestions: document.getElementById('assistantSuggestions')
};

if (elements.form && elements.input && elements.messages && elements.status) {
    bootstrapAssistant().catch((error) => {
        console.error('Recruiter assistant bootstrap failed:', error);
        setStatus('error', 'Model failed to load');
        appendBotMessage('The recruiter assistant could not load the Hugging Face model in this browser session. You can still use the rest of the portfolio and try refreshing the page.');
    });
}

async function bootstrapAssistant() {
    wireSuggestionClicks();
    bindForm();
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
    appendBotMessage('Recruiter assistant is ready. Ask about experience, skills, AI testing work, domain background, projects, desktop automation, or leadership scope.');
}

function handleProgress(progress) {
    if (!progress || typeof progress.progress !== 'number') {
        return;
    }

    const percent = Math.max(0, Math.min(100, Math.round(progress.progress * 100)));
    setStatus('loading', `Loading ${percent}%`);
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
    setStatus('loading', 'Thinking...');

    try {
        const queryEmbedding = await createEmbedding(question);
        const rankedEntries = rankKnowledge(queryEmbedding).slice(0, 3);
        const answer = buildAnswer(question, rankedEntries);
        appendBotMessage(answer);
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

function buildAnswer(question, rankedEntries) {
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
}
