# ProfIT: проектирование REST API и асинхронного обмена

Артефакты: [`openapi.yaml`](../openapi.yaml) (OpenAPI 3.0.3), [`asyncapi.yaml`](../asyncapi.yaml) (AsyncAPI 3.0.0).  
Контекст и контейнеры: [`ProfIT_C1_context_fixed.puml`](./ProfIT_C1_context_fixed.puml), [`ProfIT_C2_draft3.puml`](./ProfIT_C2_draft3.puml).

---

## 1. Архитектура и границы

### 1.1. Предметная область

ProfIT поддерживает продвижение новой товарной группы (настольные игры и паззлы):

1. Сотрудник проводит офлайн-турнир или публикует онлайн-тест.
2. Участник проходит активность; система фиксирует результат и основание для промокода (GAME или TEST — ровно одно).
3. Промокод создаётся и уходит по email; провайдер сообщает accept / delivery / error.
4. Получатель в магазине предъявляет код; торговый контур спрашивает применимость к составу заказа.
5. После подтверждённой покупки код активируется один раз; продажи (с кодом и без) уходят в аналитику.

Внутренние роли MVP: `EMPLOYEE`, `OWNER`. Глобальной регистрации публичного пользователя нет.

### 1.2. Что является системой записи

Ядро BPMSoft хранит доменные объекты, гоняет процессы и права. Integration API — фасад с минимальными правами: не дублирует админку платформы и не открывает ядро напрямую публике.

| Контур | Как работает | Контракт |
|--------|--------------|----------|
| Сотрудник / владелец | Веб-клиент BPMSoft → ядро | Штатные механизмы платформы |
| Отчёты R-1–R-4 | Веб-клиент → Insight | Без отдельного REST отчётности |
| Публичный пользователь | Web/Mobile → Integration API → ядро | OpenAPI `/public/*` |
| Торговый контур | → Integration API → ядро | OpenAPI `/integrations/commerce/*` |
| Почтовый провайдер | → CES (webhook) → ядро | OpenAPI `/integrations/mail/*` |
| Фоновая отправка / аннуляция | Ядро → брокер → воркеры → CES | AsyncAPI |

**Не проектируется:** отдельный универсальный Backend ProfIT, своя хранилка паролей/ролей вместо BPMSoft, публичная активация промокода.

### 1.3. Синхронное и асинхронное

- **Синхронно:** каталог, тесты, validate/confirm/sales, приём mail-webhook.
- **Асинхронно:** первая отправка и retry письма, проверки DISPATCH_TIMEOUT / VALIDITY_EXPIRED, опциональное событие активации кода.

RabbitMQ и фоновые воркеры — проектная схема (нужна проверка у вендора/заказчика). Webhook провайдера сам по себе не становится сообщением в брокере.

---

## 2. Аудит исходного черновика OpenAPI

Легенда: **С** сохранить · **И** исправить · **О** объединить · **Искл** исключить.

| Метод и путь | Назначение | Инициатор → получатель | C1/C2 | Эпик | Сущности | Решение | Проблемы | Корректировка |
|--------------|------------|------------------------|-------|------|----------|---------|-----------|---------------|
| `POST /auth/login` | Логин сотрудника | Employee → API | Дублирует BPMSoft | E-7 | EmployeeAccount | **Искл** | Своя auth | Сессии BPMSoft |
| `GET/POST /tournaments…` | CRUD турниров/сессий/ходов | Employee → API | Admin UI | E-1 | Tournament, GameSession, … | **Искл** | Админ в интеграционном API | BPMSoft / Mobile 2.0 |
| `GET/POST /tests…`, publish | Админ тестов | Employee → API | Admin UI | E-2 | OnlineTest, TestVersion | **Искл** | Смешение admin/public | BPMSoft |
| `GET /promocodes…`, send, cancel | Админ промокодов | Employee/Owner → API | Admin UI | E-3 | PromoCode | **Искл** | PII в query; send должен быть async | BPMSoft; send → AsyncAPI |
| `GET/POST/PATCH /products` | Админ каталога | Employee → API | Admin UI | E-4 | Product | **Искл** | Поле `theme` не из модели | BPMSoft |
| `GET /reports/…` | Отчёты | Owner → API | Insight | E-6 | агрегаты | **Искл** | Дубль Insight | Insight |
| `GET /public/products` | Каталог | Public → API | Web/Mobile→API | E-4 | Product | **И** | Дубль prefix servers; theme | `/api/v1/public/…`, без theme |
| `GET /public/tests`, attempts… | Тесты | Public → API | то же | E-2 | TestAttempt, … | **И** | Нет токена попытки, слабая модель | attemptToken, published-version |
| `POST /public/promocodes/validate` | Проверка кода | Заявлен public | Должен быть Commerce | E-3/E-5 | PromoCode | **И** | Одна позиция; публичный доступ | `/integrations/commerce/…`, multi-line |
| `POST /public/promocodes/activate` | Активация | Аноним public | Нарушает C1/C2 | E-3/E-5 | PromoCode | **Искл** | Несанкционированная активация | Только `POST …/purchases` |

Системные дефекты черновика, которые пришлось снять целиком:

1. Два `servers` (`/admin/v1`, `/public/v1`) плюс пути `/public/...` → неоднозначные URL.
2. Нет разделения контуров доверия в `securitySchemes`.
3. `status` в problem details как string — против RFC 9457.
4. Русские enum статусов ≠ доменные коды (`CREATED`, `READY_TO_ACTIVATE`, …).
5. «Отправлена» у попытки отправки смешивала accept и delivery.
6. Не было контракта всех продаж и mail-webhook.
7. Не было стабильных `operationId`.

---

## 3. Реестр REST-операций (целевой контракт)

| operationId | Актор | Метод | Путь | Назначение | Security | Успех | Типичные ошибки |
|-------------|-------|-------|------|------------|----------|-------|-----------------|
| listPublicProducts | Public | GET | `/public/products` | Каталог | — | 200 | 400,429,500,503 |
| getPublicProduct | Public | GET | `/public/products/{id}` | Карточка | — | 200 | 404,429,500,503 |
| listPublicOnlineTests | Public | GET | `/public/tests` | Список тестов | — | 200 | 400,429,500,503 |
| getPublishedTestVersion | Public | GET | `/public/tests/{id}/published-version` | Вопросы без `correct` | — | 200 | 404,429,500,503 |
| createTestAttempt | Public | POST | `/public/test-attempts` | Старт; выдаёт attemptToken | — | 201 | 400,404,409,422,429,500,503 |
| getTestAttempt | Public | GET | `/public/test-attempts/{id}` | Состояние/результат | AttemptTokenAuth | 200 | 401,403,404,429,500,503 |
| submitAttemptAnswer | Public | POST | `…/answers` | Ответ на вопрос | AttemptTokenAuth + Idempotency-Key | 204 | 400,401,403,404,409,422,429,500,503 |
| finishTestAttempt | Public | POST | `…/finish` | Завершение | AttemptTokenAuth + Idempotency-Key | 200 | 400,401,403,404,409,422,429,500,503 |
| validatePromoCodeForOrder | Commerce | POST | `/integrations/commerce/promocodes/validate` | Применимость к корзине | CommerceApiKey | 200 | 400,401,403,422,429,500,503 |
| confirmPurchase | Commerce | POST | `/integrations/commerce/purchases` | Покупка ± активация | CommerceApiKey + Idempotency-Key | 201/200 | 400,401,403,409,422,429,500,503 |
| submitSalesBatch | Commerce | POST | `/integrations/commerce/sales` | Продажи / baseline | CommerceApiKey + Idempotency-Key | 202 | 400,401,403,409,422,429,500,503 |
| receiveMailProviderEvent | Provider | POST | `/integrations/mail/provider-events` | Статусы письма | MailWebhookSignature | 202 | 400,401,403,409,422,429,500,503 |

Админ REST не вводится. Отмена промокода, права, деактивация сотрудника — BPMSoft + Permission. Право `ACCOUNT_DEACTIVATE` — открытый вопрос к матрице доступов.

### 3.1. Онлайн-тест: инварианты

- Публике видна только опубликованная версия; она неизменяема.
- Попытка привязана к `versionId`; вариант ответа должен принадлежать вопросу этой версии.
- Повторный ответ на тот же вопрос → `409`.
- У незавершённой попытки `score` / `successful` = null.
- Незавершённая попытка на ту же версию при уже известном email → `409` (`TEST_ATTEMPT_IN_PROGRESS`); создание попыток ещё и rate-limited (`429` + `Retry-After`).
- После успешного finish основание на промокод может уйти в очередь; сам код в публичный ответ не отдаётся — только статус выдачи.

### 3.2. Торговый контур: инварианты

- Validate не активирует код.
- Несколько позиций; скидка только на товары целевой группы.
- Активация только из доверенного `confirmPurchase` при `READY_TO_ACTIVATE`, живом `expiresAt`, однократности.
- Sales-пакет нужен для E-6 целиком (с кодом и без, плюс `BASELINE`); сверка с purchases и возвраты — вне MVP-контракта.

### 3.3. HTTP-сквозные правила

Описаны в `info` OpenAPI: корреляция, идемпотентность, деньги (decimal string), версионирование и вывод `v1`, единый `503`, связь с AsyncAPI через `externalDocs`.

---

## 4. Асинхронные сообщения

| Сообщение | Тип | Source → Consumer | Канал | Суть payload | Доставка | Идемпотентность |
|-----------|-----|-------------------|-------|--------------|----------|-----------------|
| PromoDispatchRequested | Command | Core → Worker/CES | `promocodes.dispatch.requested.v1` | promoCodeId, ground, email, deadline, attempt=1 | Queue, at-least-once | promoCodeId+attemptNumber |
| PromoDispatchRetryRequested | Command | Core → Worker | `promocodes.dispatch.retry.requested.v1` | attempt≥2, reason | Queue | то же |
| PromoDispatchTimeoutCheck | Command | Scheduler → Worker | `promocodes.dispatch.timeout.check.v1` | promoCodeId, deadline | Queue | повтор = no-op |
| PromoValidityExpireCheck | Command | Scheduler → Worker | `promocodes.validity.expire.check.v1` | promoCodeId, expiresAt | Queue | no-op на терминале |
| PromoCodeActivated | Domain event | Core → subscribers | `promocodes.activated.v1` | purchaseId, discountTotal | Topic | source+id |

Конверт: CloudEvents 1.0, structured mode. Outbox между записью в БД и публикацией — проектное решение против потери команд.

### 4.1. ADR: команда на код vs выборка планировщика

**Гибрид:**

1. Первая отправка и retry — **команда на каждый PromoCode** (outbox → очередь). Так не теряется постановка письма при сбое между commit и брокером.
2. DISPATCH_TIMEOUT и VALIDITY_EXPIRED — **периодическая выборка** кандидатов в БД, затем check-команды только по найденным id. Не плодим таймер на каждый код в момент создания.

TTL сообщений согласованы с бизнес-окнами (24h на dispatch/retry, 1h на check, 72h на event) — числа помечены как предложения для согласования. Очереди команд: DLX → DLQ после ограниченных retry воркера; потребитель идемпотентен. Exactly-once end-to-end брокер не обещает.

### 4.2. Жизненные циклы

**PromoCode:** `CREATED → READY_TO_ACTIVATE → ACTIVATED`; терминалы `CANCELLED`, `ANNULLED` (в т.ч. `DISPATCH_TIMEOUT`, `VALIDITY_EXPIRED`).

**PromoSendAttempt:** `CREATED → ACCEPTED_BY_PROVIDER → DELIVERED | FAILED`.

Ключевые правила:

- Создание кода ≠ успешная отправка.
- Первый допустимый accept до `deliveryDeadlineAt` задаёт `sentAt` и может перевести код в `READY_TO_ACTIVATE`.
- `expiresAt` = `sentAt` + `validityDays`.
- DELIVERED не подменяет accept.
- Запоздавшие ответы провайдера обновляют историю попытки, но не воскрешают терминальный код.
- Повторная отправка = новая `PromoSendAttempt`, не новый `PromoCode`.
- Дедуп событий провайдера по `providerEventId` (и связке message id + type).

R-2–R-4 читают `sentAt` и статусы **из БД** через Insight; отдельный streaming-event «письмо принято» в MVP не нужен.

Webhook провайдера — в OpenAPI; CES→ядро — внутренняя операция платформы.

---

## 5–6. Спецификации

- [`../openapi.yaml`](../openapi.yaml)
- [`../asyncapi.yaml`](../asyncapi.yaml)

---

## 7. Трассировка: эпик → маршрут → контракт → инвариант

| Эпик | Сценарий | Актор C1 | Контейнеры C2 | REST / Message | Сущность | Инвариант |
|------|----------|----------|---------------|----------------|----------|-----------|
| E-1 | Результаты турнира | Сотрудник | AdminClient / Mobile → Core | BPMSoft UI | Tournament, GameSession, GameTurn | Баллы считает ядро; explainer/guesser раздельно |
| E-2 | Публикация теста | Сотрудник | AdminClient → Core | — | OnlineTest, TestVersion | Черновик скрыт; `successThreshold` обязателен |
| E-2 | Прохождение теста | Пользователь теста | Web/Mobile → API → Core | public test-attempts* | TestAttempt, AttemptAnswer | Без `correct` до finish; score на сервере |
| E-3 | Выдача промокода | Ядро | Core → Rabbit → Worker → CES → Mail | Async dispatch.* | PromoCode, PromoSendAttempt | Одно основание GAME \| TEST |
| E-3 | Статусы письма | Провайдер | Mail → CES → Core | `receiveMailProviderEvent` | PromoSendAttempt | accept ≠ delivered; дедуп event id |
| E-3 | Аннуляция | Планировщик | Scheduler → Rabbit → Worker → Core | timeout/expire checks | PromoCode | DISPATCH_TIMEOUT / VALIDITY_EXPIRED |
| E-3/E-5 | Проверка кода | Торговый контур | Commerce → API → Core | `validatePromoCodeForOrder` | PromoCode, Product | Multi-line; цена запроса не авторитетна |
| E-3/E-5 | Активация | Торговый контур | Commerce → API → Core | `confirmPurchase` | Purchase, PromoCode | Только READY_TO_ACTIVATE; однократно |
| E-4 | Каталог | Покупатель | Web/Mobile → API → Core | `list/getPublicProduct*` | Product, ProductGroup | Только published |
| E-6 | Все продажи | Торговый контур | Commerce → API → Core | `submitSalesBatch` | Purchase, PurchaseItem | С кодом и без; BASELINE |
| E-6 | Отчёты R-1–R-4 | Владелец | AdminClient → Insight | — | агрегаты | Без сравнения среднего чека участник/неучастник |
| E-7 | Роли/сессии | Владелец/Сотрудник | AdminClient → Core | — | Role, Permission, AdminSession | EMPLOYEE, OWNER |

---

## 8. Безопасность (три контура)

1. **Public** — только опубликованные данные и своя попытка (`AttemptTokenAuth`). Нет права активировать чужой промокод.
2. **Staff** — BPMSoft auth/roles/permissions; не дублируется в Integration API.
3. **Machines** — Commerce API key; mail webhook signature + anti-replay.

Публичный каталог не отдаёт служебные статусы; опубликованный тест не отдаёт `correct` до проверки на сервере.

---

## 9. Проверка качества контрактов

Локально:

```bash
npm run evidence   # парсеры OpenAPI/AsyncAPI + Prism mock + smoke
```

Лог: [`validation_log.txt`](./validation_log.txt).

Smoke бьёт позитивные сценарии и негативы на уровне контракта (нет токена/ключа → 401, rate-limit shape → 429 + `Retry-After`, конфликт/бизнес-отказ → 409/422 через примеры спецификации). Prism **не** подменяет ядро BPMSoft: доменные отказы (группа товара, срок, дедуп в БД) нужно гонять на стенде Integration API → ядро, когда он появится.

### Открытые вопросы

- Возвраты/отмены заказов и сверка sales ↔ purchases.
- Правила расхождения `unitPriceQuoted` и цены каталога.
- TTL `attemptToken`, финальные числа retry/TTL/DLQ брокера.
- Нужен ли отдельный канал `purchase.confirmed` сверх `promocodes.activated.v1`.
- Согласование `ACCOUNT_DEACTIVATE` в матрице прав.
- Подтверждение RabbitMQ/CES у вендора.

### Допущения

- Торговля вне ProfIT; для E-6 нужны все продажи группы и baseline.
- Unisender Go — выбранный вариант провайдера.
- RabbitMQ + воркеры — проектная схема.
- `X-API-Key` / HMAC webhook / attempt token / outbox — проектные решения до фиксации с заказчиком.
---
