# ProfIT — продвижение настольных игр на BPMSoft

**ProfIT** — система продвижения товарной группы настольных игр и паззлов: офлайн-турниры, онлайн-тесты, выдача и жизненный цикл промокодов, публичный каталог, учёт покупок и аналитика продаж.

Система записи — **BPMSoft** (объекты, процессы, роли, Insight). Заказная часть — публичные web/mobile-клиенты и **тонкий Integration API**: наружу отдаются только операции, которых нет в штатном клиенте платформы или которые нужны внешним системам (магазин, почтовый провайдер).

В репозитории — интеграционные контракты, доменная и процессные модели, материалы реализации на учебном стенде BPMSoft и отчёты по практикам № 2–7.

[![smoke 14/14](https://img.shields.io/badge/smoke-14%2F14-brightgreen)](./docs/validation_log.txt)
[![BPMN 11/11](https://img.shields.io/badge/BPMN-11%2F11-brightgreen)](./docs/pr5-bpmn/bpmn/)
[![стенд: 24 объекта, 12 справочников](https://img.shields.io/badge/%D1%81%D1%82%D0%B5%D0%BD%D0%B4%3A%2024%20%D0%BE%D0%B1%D1%8A%D0%B5%D0%BA%D1%82%D0%B0%20%C2%B7%2012%20%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BE%D1%87%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2-blue)](./docs/pr6-objects/bpmsoft/)
[![отчёты: практики № 2–7](https://img.shields.io/badge/%D0%BE%D1%82%D1%87%D1%91%D1%82%D1%8B%3A%20%D0%BF%D1%80%D0%B0%D0%BA%D1%82%D0%B8%D0%BA%D0%B8%20%E2%84%96%202%E2%80%937-blueviolet)](./docs/)

## Что где лежит и зачем

| Если нужно… | Куда идти | Что там |
|---|---|---|
| Понять предметную область: сущности, связи, правила целостности | [`docs/pr2-domain/`](./docs/pr2-domain/) | Доменная модель `domennaya/` (PlantUML + SVG): 24 сущности, 12 перечислений, 32 связи; инварианты I-01–I-44 — в отчёте |
| Увидеть границы и устройство системы | [C1](./docs/ProfIT_C1_context_fixed.puml) · [C2](./docs/ProfIT_C2_draft3.puml) · [анализ](./docs/ProfIT_API_design_analysis.md) | Кто снаружи системы, какие контейнеры внутри, почему решения приняты так (аудит, реестры, трассировка) |
| Подключить внешнюю систему — магазин, почту | [`openapi.yaml`](./openapi.yaml) · [`asyncapi.yaml`](./asyncapi.yaml) | Единственный внешний контракт ProfIT: REST-операции и сообщения брокера; всё остальное — штатный клиент BPMSoft |
| Проследить, как идут процессы и где они стыкуются | [`docs/pr5-bpmn/bpmn/`](./docs/pr5-bpmn/bpmn/) | 11 редактируемых `.bpmn`: обзорная BPMN-00 собирает все детальные процессы; `Readme.md` — журнал правок по отзыву |
| Повторить перенос модели на стенд BPMSoft | [`docs/pr6-objects/bpmsoft/`](./docs/pr6-objects/bpmsoft/) | Рабочая тетрадь по фазам: справочники → объекты → связи/UI → тесты; результат — 44 снимка стенда в `../images/p6/` |
| Узнать, кто и с каким правом что делает | [`docs/pr7-raci/`](./docs/pr7-raci/) | RACI-матрица процессов E-1–E-7 → атомарные полномочия → роли и контекстные ограничения доступа |
| Прогнать проверки самому | [`scripts/`](./scripts/) · [`scripts/bpmn/`](./scripts/bpmn/) | См. [«Проверка контрактов локально»](#проверка-контрактов-локально) и [«Процессы BPMN 2.0»](#процессы-bpmn-20); последний прогон — [`docs/validation_log.txt`](./docs/validation_log.txt) |
| Открыть отчёт по конкретной практике | папка практики в [`docs/`](./docs/) | `.typ` и собранный PDF лежат рядом, вместе со скриншотами и исходниками |

## Карта репозитория

| Папка | Что внутри |
|-------|------------|
| [`docs/pr2-domain/`](./docs/pr2-domain/) | ПР-2: отчёт [`2-pr.typ`](./docs/pr2-domain/2-pr.typ) + PDF, доменная модель `domennaya/` |
| [`docs/pr4-api/`](./docs/pr4-api/) | ПР-4: отчёт [`profit-api-practice4.typ`](./docs/pr4-api/profit-api-practice4.typ) + PDF, скриншоты прогонов Prism/smoke в `images/` |
| [`docs/pr5-bpmn/`](./docs/pr5-bpmn/) | ПР-5: отчёт [`profit-bpmn-practice5.typ`](./docs/pr5-bpmn/profit-bpmn-practice5.typ) + PDF, рендеры `ProfIT_BPMN_00–10.svg`, исходники `bpmn/` |
| [`docs/pr6-objects/`](./docs/pr6-objects/) | ПР-6: отчёт [`profit-objects-practice6.typ`](./docs/pr6-objects/profit-objects-practice6.typ) + PDF, тетрадь `bpmsoft/`, снимки `images/p6/` |
| [`docs/pr7-raci/`](./docs/pr7-raci/) | ПР-7: отчёт [`profit-raci-practice7.typ`](./docs/pr7-raci/profit-raci-practice7.typ) + PDF, `RACI_distribution.png` |
| [`scripts/`](./scripts/) | Проверка контрактов: `check-specs.js`, `smoke-mock.js`, `run-evidence.sh` |

Статус: спецификации прошли две проверки, комплект BPMN — одну; все замечания закрыты (разбор — в отчётах ПР-4 и ПР-5).

## Зачем два контракта

Синхронный REST закрывает запросы «здесь и сейчас»: каталог, попытка теста, проверка промокода по корзине, подтверждение покупки, приём webhook’а почты.

Асинхронный контур закрывает то, что нельзя надёжно делать в одном HTTP-запросе: постановка письма в CES, повторная отправка, аннуляция по таймауту доставки или по истечению срока действия кода. Маршрут (проектная схема): ядро → outbox → очередь → воркеры → CES → провайдер; статусы письма возвращаются HTTP-webhook’ом и уже внутри платформы обновляют `PromoSendAttempt` / `PromoCode`.

## Контуры API

Базовый URL (условный): `/api/v1`. Среды в спецификации — `profit-dev` и `profit-test` (не production-адреса).

### `/public/*` — анонимный посетитель

- Опубликованный каталог (`Product`, `ProductGroup`), без служебных полей.
- Опубликованные тесты и неизменяемая версия с вопросами; признак `correct` у вариантов до финиша не отдаётся.
- Попытка теста без регистрации: при создании выдаётся `attemptToken`, дальше доступ только с `X-Attempt-Token` (`AttemptTokenAuth`).
- Сервер сам считает `score` / `successful`; клиент не подменяет правильность ответа.

### `/integrations/commerce/*` — торговый контур

Машинная аутентификация (`X-API-Key`, проектное решение).

- **validate** — применимость кода к многопозиционному заказу; цена из запроса не авторитетна, скидка считается по каталогу ProfIT.
- **purchases** — подтверждение покупки; активация промокода только отсюда (не из публичного API). Идемпотентность: `Idempotency-Key` + уникальный `purchaseExternalId`.
- **sales** — пакет всех продаж целевой группы, в том числе без промокода и baseline-период (для аналитики).

### `/integrations/mail/*` — провайдер почты

Webhook статусов (`ACCEPTED_BY_PROVIDER` / `DELIVERED` / `FAILED`). Это HTTP, не сообщение RabbitMQ. Подпись: `X-Provider-Signature` (+ timestamp против replay).

### Что намеренно не в REST

Турниры, черновики тестов, админ каталога, отмена промокода, роли/сессии сотрудников, отчёты R-1–R-4 — штатный веб-клиент BPMSoft и Insight. Отдельный «универсальный backend ProfIT» и своя система паролей не проектируются.

## Статусы промокода

**PromoCode:** `CREATED → READY_TO_ACTIVATE → ACTIVATED`, терминалы `CANCELLED`, `ANNULLED`.

**PromoSendAttempt:** `CREATED → ACCEPTED_BY_PROVIDER → DELIVERED | FAILED`.

Accept провайдера ≠ доставка. `sentAt` / переход в `READY_TO_ACTIVATE` — от первого допустимого accept до `deliveryDeadlineAt`. Отчёты по отправкам строятся по полям в БД (Insight), без обязательного отдельного event’а «письмо принято».

Подробнее — в анализе и в описаниях `openapi.yaml` / `asyncapi.yaml`.

## Общие правила HTTP

- Ошибки: `application/problem+json` (RFC 9457), `status` — число.
- Деньги: строка decimal, scale=2 (например `"1490.00"`); MVP-валюта — `RUB`.
- `X-Correlation-ID` — опционален на входе; если нет, сервер генерирует и отдаёт в ответе.
- `Idempotency-Key`: тот же ключ + то же тело → исходный успех; тот же ключ + другое тело → `409`.
- `503` — единообразно при недоступности ядра/зависимостей; на `429`/`503` смотреть `Retry-After`.

## Проверка контрактов локально

```bash
npm install
npm run evidence   
```

По шагам:

```bash
npm run check
npm run mock        # http://127.0.0.1:4010
npm run smoke       # другой терминал
```

Prism слушает пути **как в YAML** (`/public/...`), без префикса `/api/v1` из `servers`. Mock проверяет форму запросов/ответов и примеры; доменные правила BPMSoft он не исполняет.

Опционально: `npm run lint:openapi`.

Скриншоты прогона Prism и smoke — [`docs/pr4-api/images/`](./docs/pr4-api/images/) (`image1.png` … `image2.1.png`), машинное доказательство — [`docs/validation_log.txt`](./docs/validation_log.txt) (`AsyncAPI OK: channels=6, ops=12`; smoke 14/14).

## Процессы BPMN 2.0

Комплект из 11 редактируемых диаграмм — [`docs/pr5-bpmn/bpmn/ProfIT_BPMN_00…10.bpmn`](./docs/pr5-bpmn/bpmn/) (BPMN 2.0 XML + BPMNDI). Обзорная BPMN-00 собирает детальные процессы через Call Activity и показывает message flow к внешним участникам (пользователь, торговая система, почтовый провайдер, владелец, сотрудник); BPMN-01–10 покрывают бэклог E-1–E-7.

Стыки процессов — события-сообщения: основание GAME/TEST (01/03) → выдача промокода (05) → активация по покупке (06) → пакет продаж (08) → отчёты R-1–R-4 (10). Контроль сроков — плановой проверкой BPMN-07, а не таймером на каждый код — то же решение, что ADR в `asyncapi.yaml`.

Проверка комплекта:

```bash
node scripts/bpmn/check_files.mjs   # висячие ссылки, fan-out event-шлюзов, стрелки сквозь узлы
node scripts/bpmn/render.mjs        # SVG → docs/pr5-bpmn/, PNG-превью → /tmp (bpmn-js + Chrome)
```

Генерация `.bpmn` из спецификаций `scripts/bpmn/diagrams.mjs`: `node scripts/bpmn/build.mjs --render`. Журнал исправлений по отзыву — [`docs/pr5-bpmn/bpmn/Readme.md`](./docs/pr5-bpmn/bpmn/Readme.md).

## Модель на стенде BPMSoft

Рабочая тетрадь [`docs/pr6-objects/bpmsoft/`](./docs/pr6-objects/bpmsoft/) — пошаговый перенос доменной модели на учебный стенд: 12 справочников (`01-lookups.md`), 24 объекта + связка `ChuRolePermission` колонка за колонкой (`02-objects.md`), связи/детали/разделы/рабочее место (`03-links-ui.md`), тестовые данные и чек-лист проверок (`04-testing-report.md`). Инварианты, которые lookup-ссылка не гарантирует (кратность 1:1, XOR, «тот же родитель»), помечены «требуется серверная проверка». Результат со скриншотами стенда — в отчёте практики № 6.
