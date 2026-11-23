// План саморазвития на 30 дней: по часу в день.
// Формат дня: [трек, тема, зачем, [[тип, название, ссылка, минуты, язык]], практика]
// Треки: po = владелец продукта, ai = ИИ и RAG. Типы: v = видео, a = статья, c = курс, t = инструмент.
window.LEARN_TRACKS = {
  po: { name: 'Владелец продукта', color: '#6366f1' },
  ai: { name: 'ИИ и RAG', color: '#0ea5a4' }
};
window.LEARN_PLAN = [
  ['po', 'Кто такой владелец продукта', 'Понять, за что вы отвечаете и чем роль отличается от менеджера проектов.', [
    ['v', 'Henrik Kniberg: Agile Product Ownership in a Nutshell', 'https://www.youtube.com/watch?v=502ILHjX9EE', 16, 'EN'],
    ['a', 'Конспект и картинка к этому видео', 'https://blog.crisp.se/2012/10/25/henrikkniberg/agile-product-ownership-in-a-nutshell', 10, 'EN'],
    ['a', 'SVPG: Product Manager vs. Product Owner Revisited', 'https://www.svpg.com/product-manager-vs-product-owner-revisited/', 15, 'EN']],
    'Запишите в заметки: какой у вас продукт, кто пользователи, кто заказчики и какое одно решение на этой неделе принимаете именно вы.'],
  ['po', 'Скрам за один час', 'Знать правила игры: роли, события и артефакты, чтобы говорить с командой на одном языке.', [
    ['a', 'Руководство по Скраму 2020 (официальный перевод)', 'https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-Russian.pdf', 45, 'RU']],
    'Отметьте, какие события и артефакты из руководства у вашей команды есть, а каких нет. Выберите одно, которого больше всего не хватает.'],
  ['ai', 'Как устроены большие языковые модели', 'Получить базовую картину: что такое LLM, как она обучается и где ошибается.', [
    ['v', 'Andrej Karpathy: Intro to Large Language Models', 'https://www.youtube.com/watch?v=zjkBMFhNj_g', 60, 'EN']],
    'Запишите своими словами три ограничения LLM, которые важны для ваших рабочих задач.'],
  ['po', 'Бэклог продукта', 'Научиться держать один упорядоченный список работы, понятный команде и заказчикам.', [
    ['a', 'Atlassian: Product backlog, tips for creation and prioritization', 'https://www.atlassian.com/agile/scrum/backlogs', 20, 'EN'],
    ['a', 'Roman Pichler: Seven Product Backlog Mistakes to Avoid', 'https://www.romanpichler.com/blog/product-backlog-mistakes/', 15, 'EN'],
    ['a', 'Roman Pichler: Product Backlog FAQs', 'https://www.romanpichler.com/blog/product-backlog-faqs/', 15, 'EN']],
    'Проверьте свой бэклог по семи ошибкам из статьи и выпишите две, которые исправите первыми.'],
  ['ai', 'Что такое RAG', 'Понять, зачем модели внешний поиск и из каких частей состоит RAG.', [
    ['a', 'Pinecone: Retrieval-Augmented Generation', 'https://www.pinecone.io/learn/retrieval-augmented-generation/', 25, 'EN'],
    ['a', 'Pinecone: What is a Vector Database', 'https://www.pinecone.io/learn/vector-database/', 25, 'EN']],
    'Нарисуйте схему RAG для своей рабочей задачи: откуда данные, как режутся, где хранятся, как ищутся, что попадает в запрос к модели.'],
  ['po', 'Как ставить задачи: пользовательские истории', 'Писать задачи так, чтобы команда понимала, зачем это нужно и когда готово.', [
    ['a', 'Критерии INVEST для хорошей истории', 'https://en.wikipedia.org/wiki/INVEST_(mnemonic)', 10, 'EN'],
    ['a', 'Mountain Goat Software: Story Splitting', 'https://www.mountaingoatsoftware.com/agile/user-stories/story-splitting-how-to-split-user-stories-so-teams-can-finish', 25, 'EN'],
    ['a', 'Atlassian: Definition of Ready', 'https://www.atlassian.com/agile/project-management/definition-of-ready', 15, 'EN']],
    'Перепишите три задачи из бэклога в формате «Как [кто], я хочу [что], чтобы [зачем]» и добавьте критерии приёмки.'],
  ['ai', 'RAG своими руками', 'Увидеть весь конвейер в коде: индексация, поиск, генерация.', [
    ['v', 'LangChain: Learn RAG From Scratch (первый час)', 'https://www.youtube.com/watch?v=sVcwVQRHIc8', 60, 'EN'],
    ['t', 'Ноутбуки к видео', 'https://github.com/langchain-ai/rag-from-scratch', 0, 'EN']],
    'Запишите этапы конвейера и напротив каждого: что на этом этапе чаще всего ломается.'],
  ['po', 'Когда задача готова: Definition of Done', 'Договориться с командой об одном понимании «готово», чтобы не возвращаться к сделанному.', [
    ['a', 'Scrum.org: What is a Definition of Done', 'https://www.scrum.org/resources/what-definition-done', 15, 'EN'],
    ['a', 'Scrum.org: подборка материалов для владельцев продукта', 'https://www.scrum.org/resources-product-owners', 30, 'EN']],
    'Напишите черновик Definition of Done из 5–7 пунктов и покажите его команде.'],
  ['po', 'Встреча по уточнению бэклога (refinement)', 'Сделать так, чтобы на планирование задачи приходили понятными и оценёнными.', [
    ['a', 'Atlassian: What is Backlog Refinement', 'https://www.atlassian.com/agile/scrum/backlog-refinement', 20, 'EN'],
    ['a', 'Roman Pichler: Tips for Reducing the Product Backlog Size', 'https://www.romanpichler.com/blog/how-to-reduce-the-product-backlog-size/', 15, 'EN']],
    'Составьте повестку refinement на 45 минут и удалите или заархивируйте из бэклога задачи, к которым не возвращались полгода.'],
  ['ai', 'Чанкинг: как резать документы', 'Разобраться в способах нарезки текста и в том, как размер чанка влияет на поиск.', [
    ['a', 'Pinecone: Chunking Strategies for LLM Applications', 'https://www.pinecone.io/learn/chunking-strategies/', 25, 'EN'],
    ['v', 'Greg Kamradt: The 5 Levels Of Text Splitting For Retrieval', 'https://www.youtube.com/watch?v=8OJC21T2SL4', 35, 'EN']],
    'Возьмите один рабочий документ и решите, как бы вы его резали: по размеру, по структуре или по смыслу. Запишите почему.'],
  ['po', 'Оценка задач: story points', 'Понять, зачем оценивать относительно, а не в часах, и как из оценок получается прогноз.', [
    ['a', 'Atlassian: Story points and estimation', 'https://www.atlassian.com/agile/project-management/estimation', 20, 'EN'],
    ['a', 'Mountain Goat Software: Why the Fibonacci Sequence Works Well for Estimating', 'https://www.mountaingoatsoftware.com/agile/why-the-fibonacci-sequence-works-well-for-estimating', 15, 'EN']],
    'Выберите эталонную задачу на 3 балла и оцените относительно неё пять задач из бэклога.'],
  ['ai', 'Как оценивать чанки', 'Научиться измерять качество нарезки, а не выбирать её на глаз.', [
    ['a', 'Chroma Research: Evaluating Chunking Strategies for Retrieval', 'https://research.trychroma.com/evaluating-chunking', 35, 'EN'],
    ['a', 'Anthropic: Contextual Retrieval', 'https://www.anthropic.com/news/contextual-retrieval', 25, 'EN']],
    'Соберите 10 реальных вопросов и для каждого отметьте фрагмент документа с правильным ответом. Это ваш первый набор для проверки поиска.'],
  ['po', 'Покер планирования', 'Проводить оценку всей командой быстро и без давления авторитетом.', [
    ['a', 'Mountain Goat Software: Planning Poker', 'https://www.mountaingoatsoftware.com/agile/planning-poker', 20, 'EN'],
    ['a', 'Mountain Goat Software: Why the Whole Team Should Participate When Estimating', 'https://www.mountaingoatsoftware.com/agile/why-the-whole-team-should-participate-when-estimating', 15, 'EN'],
    ['a', 'Mountain Goat Software: Don\'t Average During Planning Poker', 'https://www.mountaingoatsoftware.com/agile/dont-average-during-planning-poker', 10, 'EN']],
    'Запланируйте с командой 30 минут покера на ближайшие задачи и запишите, где оценки разошлись сильнее всего и почему.'],
  ['ai', 'Точнее поиск: гибридный поиск и реранкинг', 'Узнать два самых частых способа поднять качество выдачи.', [
    ['a', 'Pinecone: Hybrid search', 'https://www.pinecone.io/learn/hybrid-search-intro/', 20, 'EN'],
    ['a', 'Pinecone: Rerankers and Two-Stage Retrieval', 'https://www.pinecone.io/learn/series/rag/rerankers/', 25, 'EN'],
    ['a', 'Pinecone Docs: Increase search relevance', 'https://docs.pinecone.io/guides/optimize/increase-relevance', 15, 'EN']],
    'Для своей задачи запишите: какие запросы лучше ловит поиск по ключевым словам, а какие по смыслу.'],
  ['po', 'Приоритизация: RICE', 'Сравнивать разнородные задачи по одной понятной формуле.', [
    ['a', 'Intercom: RICE, simple prioritization for product managers', 'https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/', 20, 'EN']],
    'Посчитайте RICE для десяти задач из бэклога и сравните порядок с текущим. Что удивило?'],
  ['po', 'Приоритизация: WSJF и стоимость задержки', 'Учитывать, сколько стоит каждая неделя ожидания задачи.', [
    ['a', 'Black Swan Farming: WSJF, Weighted Shortest Job First', 'https://blackswanfarming.com/wsjf-weighted-shortest-job-first/', 30, 'EN']],
    'Для трёх самых спорных задач оцените стоимость задержки за неделю и длительность. Изменился ли порядок?'],
  ['ai', 'Метрики качества RAG', 'Понимать, что именно измерять: поиск отдельно, ответ отдельно.', [
    ['a', 'Ragas: список метрик (faithfulness, context precision, context recall)', 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/', 30, 'EN'],
    ['v', 'Langfuse: Beginner\'s Guide to RAG Evaluation', 'https://langfuse.com/guides/videos/beginners-guide-to-rag-evaluation', 30, 'EN']],
    'Выберите по одной метрике для поиска и для ответа, которые будете считать в своём проекте, и запишите почему именно их.'],
  ['po', 'Несколько команд просят своё, а ресурс один', 'Научиться решать конфликт приоритетов прозрачно, а не по громкости просьбы.', [
    ['a', 'Roman Pichler: Prioritising a Product Backlog When Everything is Important', 'https://www.romanpichler.com/blog/prioritising-a-product-backlog-when-everything-is-important/', 20, 'EN'],
    ['a', 'Roman Pichler: 5 Tips for Saying No to Stakeholders', 'https://www.romanpichler.com/blog/tips-for-saying-no-to-stakeholders/', 15, 'EN'],
    ['a', 'Intercom: Product strategy means saying no', 'https://www.intercom.com/blog/product-strategy-means-saying-no/', 15, 'EN']],
    'Опишите на одной странице правило приёма запросов: куда приносить, по каким критериям сравниваете, когда и где объявляете решение.'],
  ['ai', 'Evals: как системно улучшать RAG', 'Построить цикл «измерили, нашли слабое место, исправили».', [
    ['a', 'Hamel Husain: Your AI Product Needs Evals', 'https://hamel.dev/blog/posts/evals/', 35, 'EN'],
    ['a', 'Jason Liu: Systematically Improving Your RAG', 'https://jxnl.co/writing/2024/05/22/systematically-improving-your-rag/', 25, 'EN']],
    'Запишите план на неделю: какие 20 вопросов проверяете, кто размечает ответы, какую цифру считаете успехом.'],
  ['po', 'Работа со стейкхолдерами', 'Выстроить отношения с заказчиками так, чтобы решения принимались вместе и заранее.', [
    ['a', 'Roman Pichler: Stakeholder Management FAQs', 'https://www.romanpichler.com/blog/stakeholder-management-faqs/', 20, 'EN'],
    ['a', 'Product Talk: Show Your Work, how to get stakeholder buy-in', 'https://www.producttalk.org/show-your-work/', 25, 'EN']],
    'Составьте карту стейкхолдеров: влияние и интерес. Для двух самых влиятельных запишите, как часто и в каком формате вы с ними сверяетесь.'],
  ['ai', 'Быстрее и дешевле: как сокращать поиск', 'Понять, где RAG теряет время и как уменьшить объём поиска без потери качества.', [
    ['a', 'Jason Liu: Levels of Complexity, RAG Applications', 'https://jxnl.co/writing/2024/02/28/levels-of-complexity-rag-applications', 25, 'EN'],
    ['v', 'OpenAI: A Survey of Techniques for Maximizing LLM Performance', 'https://www.youtube.com/watch?v=ahnGLM-RC1Y', 45, 'EN']],
    'Запишите, что можно сократить у вас: фильтры по метаданным до поиска, меньше чанков в запросе, кэш частых вопросов, реранкер только на первых 20 результатах.'],
  ['po', 'Обязательные встречи команды', 'Знать цель каждой встречи и не проводить лишних.', [
    ['a', 'Atlassian: A guide to agile ceremonies and scrum meetings', 'https://www.atlassian.com/agile/scrum/ceremonies', 25, 'EN'],
    ['a', 'Atlassian: Scrum sprints', 'https://www.atlassian.com/agile/scrum/sprints', 20, 'EN']],
    'Составьте календарь спринта: планирование, ежедневная встреча, refinement, обзор, ретроспектива. Для каждой запишите цель, длительность и участников.'],
  ['po', 'Обзор спринта и ретроспектива', 'Получать обратную связь по продукту и улучшать процесс каждые две недели.', [
    ['a', 'Atlassian Team Playbook: Retrospective', 'https://www.atlassian.com/team-playbook/plays/retrospective', 20, 'EN'],
    ['a', 'Roman Pichler: Succeeding with Scrum, 10 Tips for Product People', 'https://www.romanpichler.com/blog/succeeding-with-product-delivery-and-scrum/', 20, 'EN']],
    'Подготовьте сценарий ближайшего обзора спринта: что показываете, кого зовёте, какие три вопроса задаёте заказчикам.'],
  ['ai', 'Какие LLM выбирать и как их сравнивать', 'Выбирать модель по своим задачам: качество, цена, скорость, размер контекста.', [
    ['t', 'LMArena: рейтинг моделей по слепым сравнениям', 'https://lmarena.ai/leaderboard/text', 15, 'EN'],
    ['t', 'Artificial Analysis: качество, цена и скорость моделей', 'https://artificialanalysis.ai/', 20, 'EN'],
    ['t', 'MTEB: рейтинг моделей эмбеддингов', 'https://huggingface.co/spaces/mteb/leaderboard', 15, 'EN']],
    'Сделайте таблицу из трёх моделей-кандидатов: цена за миллион токенов, скорость, контекст. Прогоните на них свои 10 вопросов и сравните ответы вслепую.'],
  ['po', 'Цели продукта и дорожная карта', 'Перейти от списка фич к целям, под которые команда сама предлагает решения.', [
    ['a', 'Roman Pichler: Leading Through Shared Goals', 'https://www.romanpichler.com/blog/leading-through-shared-goals/', 20, 'EN'],
    ['a', 'SVPG: Product vs. Feature Teams', 'https://www.svpg.com/product-vs-feature-teams/', 20, 'EN']],
    'Сформулируйте цель продукта на квартал и две цели спринтов, которые к ней ведут. Проверьте: цель измерима?'],
  ['ai', 'Паттерны LLM-продуктов', 'Собрать знания в систему: какие приёмы есть и когда какой применять.', [
    ['a', 'Eugene Yan: Patterns for Building LLM-based Systems and Products', 'https://eugeneyan.com/writing/llm-patterns/', 40, 'EN'],
    ['a', 'O\'Reilly: What We Learned from a Year of Building with LLMs, Part I', 'https://www.oreilly.com/radar/what-we-learned-from-a-year-of-building-with-llms-part-i/', 25, 'EN']],
    'Выберите два паттерна, которых у вас ещё нет, и запишите, какую проблему каждый решит.'],
  ['po', 'MVP и нарезка работы', 'Выпускать ценность маленькими шагами и видеть всю картину продукта.', [
    ['a', 'Henrik Kniberg: Making sense of MVP', 'https://blog.crisp.se/2016/01/25/henrikkniberg/making-sense-of-mvp', 20, 'EN'],
    ['a', 'Jeff Patton: The New User Story Backlog is a Map', 'https://www.jpattonassociates.com/the-new-backlog/', 25, 'EN']],
    'Постройте карту историй для одной большой фичи и проведите линию первого релиза.'],
  ['ai', 'Агенты и управление контекстом', 'Понять, когда хватит простого RAG, а когда нужен агент, и как не переполнять контекст.', [
    ['a', 'Anthropic: Building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents', 30, 'EN'],
    ['a', 'Anthropic: Effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', 30, 'EN'],
    ['c', 'На будущее: курс DeepLearning.AI, Building and Evaluating Advanced RAG', 'https://www.deeplearning.ai/short-courses/building-evaluating-advanced-rag', 0, 'EN']],
    'Запишите итог по треку ИИ: что внедрите в работу в ближайший месяц и по какой метрике поймёте, что стало лучше.'],
  ['po', 'Исследование потребностей (discovery)', 'Решать, что строить, на основе разговоров с пользователями, а не догадок.', [
    ['a', 'Product Talk: Opportunity Solution Tree', 'https://www.producttalk.org/opportunity-solution-tree-origin/', 25, 'EN'],
    ['a', 'Product Talk: Everyone Can Do Continuous Discovery', 'https://www.producttalk.org/getting-started-with-discovery/', 25, 'EN']],
    'Нарисуйте дерево: цель, три потребности пользователей, по два решения на каждую. Договоритесь об одном интервью на следующей неделе.'],
  ['po', 'Сильная продуктовая команда: итог месяца', 'Сравнить свою команду с лучшими практиками и составить план на следующий месяц.', [
    ['a', 'SVPG: Good Product Team / Bad Product Team', 'https://www.svpg.com/good-product-team-bad-product-team/', 15, 'EN'],
    ['a', 'Basecamp: Shape Up (введение и первая глава)', 'https://basecamp.com/shapeup', 35, 'EN']],
    'Оцените себя по темам месяца от 1 до 5 и выберите три, которые будете углублять дальше.']
];
