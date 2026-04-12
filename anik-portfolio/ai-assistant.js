import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
env.useBrowserCache = true;
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

// Compact local embedding model downloaded and cached in browser.
const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';

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
    modeBadge: document.getElementById('assistantModeBadge')
};

if (elements.form && elements.input && elements.messages && elements.status && elements.launcher && elements.widget) {
    initializeAssistant().catch((error) => {
        console.error('Recruiter assistant initialization failed:', error);
        setStatus('error', 'Load failed');
        appendBotMessage('The local Hugging Face model failed to load in this browser session. Please refresh and try again.');
    });
}

async function initializeAssistant() {
    bindFloatingControls();
    wireSuggestionClicks();
    bindForm();
    openWidget();
    setModeBadge('Local model');
    setStatus('loading', 'Downloading local model...');

    state.embedder = await pipeline('feature-extraction', LOCAL_MODEL, {
        quantized: true,
        progress_callback: handleProgress
    });

    setStatus('loading', 'Indexing resume knowledge...');
    state.knowledgeVectors = await Promise.all(
        KNOWLEDGE_BASE.map(async (entry) => ({
            ...entry,
            embedding: await createEmbedding(entry.content)
        }))
    );

    state.isReady = true;
    setStatus('ready', 'Local assistant ready');
    appendBotMessage('Local recruiter assistant is ready. Ask about experience, frameworks, desktop automation, AI-driven testing, projects, or hiring fit.');
}

function bindFloatingControls() {
    elements.launcher.addEventListener('click', () => {
        if (state.widgetOpen) {
            closeWidget();
        } else {
            openWidget();
            elements.input.focus();
        }
    });

    elements.openButtons.forEach((button) => {
        button.addEventListener('click', () => {
            openWidget();
            elements.input.focus();
        });
    });

    if (elements.closeButton) {
        elements.closeButton.addEventListener('click', closeWidget);
    }
}

function bindForm() {
    elements.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const question = elements.input.value.trim();
        if (!question || state.isBusy) {
            return;
        }
        await answerRecruiterQuestion(question);
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
            await answerRecruiterQuestion(question);
        });
    });
}

async function answerRecruiterQuestion(question) {
    if (!state.isReady) {
        appendBotMessage('The local model is still loading. Please wait a few seconds and try again.');
        return;
    }

    state.isBusy = true;
    setControlsDisabled(true);
    appendUserMessage(question);
    elements.input.value = '';
    setStatus('loading', 'Thinking...');

    try {
        const directAnswer = getDirectAnswer(question);
        if (directAnswer) {
            appendBotMessage(directAnswer);
            setStatus('ready', 'Local assistant ready');
            return;
        }

        const queryEmbedding = await createEmbedding(question);
        const rankedEntries = rankKnowledge(queryEmbedding).slice(0, 3);
        appendBotMessage(buildAnswer(question, rankedEntries));
        setStatus('ready', 'Local assistant ready');
    } catch (error) {
        console.error('Assistant answer failed:', error);
        appendBotMessage('I hit a local inference issue for that query. Please ask again in a slightly different way.');
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
        return 'I could not confidently match that question to the resume profile. Try asking about Python automation, Playwright, Selenium, desktop automation, AI-driven testing, CI/CD, security testing, or experience at Hyland, OpenText, and Cognizant.';
    }

    const intro = inferIntro(question, topEntry.title);
    const strongest = toSentenceCase(topEntry.content);
    const support = supportingEntries
        .filter((entry) => entry.score > 0.12)
        .map((entry) => `Related context: ${toSentenceCase(entry.content)}`)
        .slice(0, 2);

    return [intro, strongest, ...support].join('\n\n');
}

function inferIntro(question, title) {
    const normalized = normalizeQuestion(question);

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
        return 'Here is the most relevant security testing context:';
    }

    if (normalized.includes('why') || normalized.includes('fit') || normalized.includes('hire')) {
        return 'Here is the strongest hiring-fit summary:';
    }

    if (normalized.includes('project')) {
        return 'Here are the most relevant project highlights:';
    }

    return `Best match from ${title}:`;
}

function getDirectAnswer(question) {
    const normalized = normalizeQuestion(question);

    if (!normalized) {
        return '';
    }

    if (
        normalized === 'name' ||
        normalized === 'full name' ||
        normalized === 'what is your name' ||
        normalized === 'what is his name' ||
        normalized === 'who is this' ||
        normalized === 'who is he'
    ) {
        return 'His name is Anik Dasgupta.';
    }

    if (normalized.includes('email') || normalized.includes('mail id') || normalized.includes('email address')) {
        return 'You can reach Anik at anikdsgpt@outlook.com.';
    }

    if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('contact number')) {
        return 'Anik’s phone number is +91 89025 53975.';
    }

    if (
        normalized.includes('location') ||
        normalized.includes('where is he based') ||
        normalized.includes('where is he located') ||
        normalized.includes('where does he live')
    ) {
        return 'Anik is based at 34 B.B Street, PIN - 712232, India.';
    }

    if (
        normalized.includes('current role') ||
        normalized.includes('current position') ||
        normalized.includes('what does he do now')
    ) {
        return 'Anik currently works as Test Engineer 3 at Hyland Software and is positioned for Senior SDET and QA Automation Engineer roles.';
    }

    if (normalized.includes('years of experience') || normalized === 'experience' || normalized.includes('how many years')) {
        return 'Anik has 9 years of QA automation experience across web, API, mobile, and desktop testing.';
    }

    if (normalized.includes('resume') || normalized.includes('cv')) {
        return 'Use the Resume link in the navigation or open anik-portfolio/resume.html on this site.';
    }

    return '';
}

function normalizeQuestion(question) {
    return question
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function toSentenceCase(text) {
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

    updateLauncherState(type);
}

function updateLauncherState(type) {
    if (!elements.launcher) {
        return;
    }

    elements.launcher.classList.remove('assistant-launcher-ready');

    if (type === 'ready' && !state.widgetOpen) {
        elements.launcher.classList.add('assistant-launcher-ready');
    }
}

function setModeBadge(label) {
    if (!elements.modeBadge) {
        return;
    }
    elements.modeBadge.textContent = label;
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

function handleProgress(progress) {
    if (!progress || typeof progress.progress !== 'number') {
        return;
    }

    const percent = Math.max(0, Math.min(100, Math.round(progress.progress * 100)));
    setStatus('loading', `Downloading model ${percent}%`);
}

function openWidget() {
    state.widgetOpen = true;
    elements.widget.hidden = false;
    elements.launcher.setAttribute('aria-expanded', 'true');
    elements.launcher.classList.add('assistant-launcher-open');
    elements.launcher.classList.remove('assistant-launcher-ready');
}

function closeWidget() {
    state.widgetOpen = false;
    elements.widget.hidden = true;
    elements.launcher.setAttribute('aria-expanded', 'false');
    elements.launcher.classList.remove('assistant-launcher-open');

    if (state.isReady) {
        elements.launcher.classList.add('assistant-launcher-ready');
    }
}
