# Проектирование синхронного API и асинхронных сообщений ProfIT

**Дисциплина:** Технологии проектирования и быстрой разработки приложений и сервисов, РТУ МИРЭА  
**Артефакты:** `openapi.yaml` (OpenAPI 3.0.3), `asyncapi.yaml` (AsyncAPI 3.0.0)  
**Дата:** 2026-10-16

---

## Часть 1. Анализ архитектуры

### 1.1. Система

ProfIT поддерживает продвижение товарной группы настольных игр и паззлов через офлайн-турниры, онлайн-тесты и промокоды. Ключевой поток: активность → основание выдачи → отправка кода → проверка в торговом контуре → активация при покупке → аналитика продаж (включая без кода).

### 1.2. Границы API


| Контур                       | Контейнер C2                    | Контракт                                          |
| ---------------------------- | ------------------------------- | ------------------------------------------------- |
| Сотрудник / Владелец         | Веб-клиент BPMSoft → ядро       | Штатные механизмы BPMSoft (не дублируются в REST) |
| Отчёты R-1–R-4               | Insight                         | Веб-клиент BPMSoft → Insight                      |
| Публичный пользователь       | Web / Mobile → Integration API  | OpenAPI `/public/*`                               |
| Торговый контур              | → Integration API               | OpenAPI `/integrations/commerce/*`                |
| Почтовый провайдер           | → CES (webhook)                 | OpenAPI `/integrations/mail/*` (HTTP, не брокер)  |
| Фоновая отправка / аннуляция | Ядро → RabbitMQ → воркеры → CES | AsyncAPI                                          |


**Не проектируется:** универсальный Backend ProfIT, собственная система паролей/ролей вместо BPMSoft, публичная активация промокода.

### 1.3. Синхронное vs асинхронное

- **Синхронно:** чтение каталога/тестов, попытка теста, validate/confirm/sales, приём webhook.
- **Асинхронно:** постановка отправки, retry, timeout/expiry checks, опциональное событие `promocodes.activated.v1`.



### 1.4. Доступность исходников


| Материал                                                | Статус                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ProfIT_C1_context_fixed.puml`, `ProfIT_C2_draft3.puml` | Использованы                                                                                              |
| Существующий `openapi.yaml`                             | Проаудирован как черновик                                                                                 |
| Лекции PPTX (HTTP API / async)                          | **Не найдены** в workspace — учтены требования задания                                                    |
| `events(1).yaml`                                        | **Не найден** — AsyncAPI построен по AsyncAPI 3.0 + CloudEvents, без копирования чужих предметных событий |
| Отдельный бэклог E-1–E-7 / доменная модель / отчёт ПР-3 | Отдельных файлов нет; использованы формулировки задания и C1/C2                                           |


---



## Часть 2. Аудит существующего OpenAPI

Легенда решений: **С** сохранить · **И** исправить · **О** объединить · **Искл** исключить.


| Метод и путь                       | Назначение          | Инициатор → получатель | C1/C2                  | Эпик    | Сущности           | Решение        | Проблемы                                                               | Корректировка                              |
| ---------------------------------- | ------------------- | ---------------------- | ---------------------- | ------- | ------------------ | -------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| `POST /auth/login`                 | Логин сотрудника    | Employee → API         | Дублирует BPMSoft auth | E-7     | EmployeeAccount    | **Искл**       | Собственная auth вместо платформы                                      | Убрать; сессии через BPMSoft               |
| `GET /tournaments`                 | Список турниров     | Employee → API         | Admin через BPMSoft UI | E-1     | Tournament         | **Искл**       | Админ CRUD в интеграционном API                                        | BPMSoft-клиент                             |
| `POST /tournaments`                | Создать турнир      | Employee → API         | то же                  | E-1     | Tournament         | **Искл**       | то же                                                                  | BPMSoft-клиент                             |
| `GET /tournaments/{id}`            | Карточка турнира    | Employee → API         | то же                  | E-1     | Tournament         | **Искл**       | то же                                                                  | BPMSoft-клиент                             |
| `POST .../sessions`                | Создать сессию      | Employee → API         | то же                  | E-1     | GameSession        | **Искл**       | то же                                                                  | BPMSoft / Mobile 2.0                       |
| `GET /sessions/{id}`               | Сессия              | Employee → API         | то же                  | E-1     | GameSession        | **Искл**       | то же                                                                  | —                                          |
| `POST .../participants`            | Участник            | Employee → API         | то же                  | E-1     | SessionParticipant | **Искл**       | то же                                                                  | —                                          |
| `PATCH .../start`                  | Старт сессии        | Employee → API         | то же                  | E-1     | GameSession        | **Искл**       | то же                                                                  | —                                          |
| `PATCH .../finish`                 | Финиш сессии        | Employee → API         | то же                  | E-1     | GameSession        | **Искл**       | то же                                                                  | —                                          |
| `POST .../rounds`                  | Раунд               | Employee → API         | то же                  | E-1     | GameRound          | **Искл**       | то же                                                                  | —                                          |
| `POST .../turns`                   | Ход                 | Employee → API         | то же                  | E-1     | GameTurn           | **Искл**       | Нет playedAt/ScoringRule в контракте создания                          | BPMSoft; баллы считает ядро                |
| `GET /tests`                       | Админ-список тестов | Employee → API         | Admin UI               | E-2     | OnlineTest         | **Искл**       | Смешение admin/public                                                  | BPMSoft                                    |
| `POST /tests`                      | Создать тест        | Employee → API         | Admin UI               | E-2     | OnlineTest         | **Искл**       | то же                                                                  | BPMSoft                                    |
| `POST .../versions`                | Черновик версии     | Employee → API         | Admin UI               | E-2     | TestVersion        | **Искл**       | то же                                                                  | BPMSoft                                    |
| `PATCH .../publish`                | Публикация          | Employee → API         | Admin UI               | E-2     | TestVersion        | **Искл**       | то же                                                                  | BPMSoft                                    |
| `GET /promocodes`                  | Поиск кодов         | Employee → API         | Admin UI               | E-3     | PromoCode          | **Искл**       | Email в query; PII                                                     | BPMSoft                                    |
| `GET /promocodes/{id}`             | Детали              | Employee → API         | Admin UI               | E-3     | PromoCode          | **Искл**       | то же                                                                  | BPMSoft                                    |
| `POST .../send`                    | Отправка            | Employee → API         | Должно быть async      | E-3     | PromoSendAttempt   | **Искл**→async | Синхронный REST вместо очереди                                         | Команда AsyncAPI                           |
| `POST .../cancel`                  | Отмена              | OWNER → API            | Admin UI               | E-3     | PromoCode          | **Искл**       | Нужны права BPMSoft                                                    | BPMSoft + Permission                       |
| `GET /products`                    | Админ-каталог       | Employee → API         | Admin UI               | E-4     | Product            | **Искл**       | Поле `theme`                                                           | BPMSoft; без theme                         |
| `POST /products`                   | Создать товар       | Employee → API         | Admin UI               | E-4     | Product            | **Искл**       | `theme` неподтверждён                                                  | BPMSoft                                    |
| `PATCH /products/{id}`             | Обновить            | Employee → API         | Admin UI               | E-4     | Product            | **Искл**       | то же                                                                  | BPMSoft                                    |
| `GET /reports/promocodes/statuses` | R-отчёт             | Owner → API            | Insight                | E-6     | PromoCode          | **Искл**       | Дублирует Insight                                                      | Владелец → Insight                         |
| `GET /reports/promocodes/cohorts`  | Когорты             | Owner → API            | Insight                | E-6     | PromoCode          | **Искл**       | то же                                                                  | Insight                                    |
| `GET /public/products`             | Публичный каталог   | Public → API           | Web/Mobile→API→core    | E-4     | Product            | **И**          | Path `/public` + server `/public/v1` = дубль; theme; published в схеме | `/api/v1/public/products`, без theme       |
| `GET /public/tests`                | Список тестов       | Public → API           | то же                  | E-2     | OnlineTest         | **И**          | Нет пагинации/версии                                                   | Расширить                                  |
| `POST /public/test-attempts`       | Старт попытки       | Public → API           | то же                  | E-2     | TestAttempt        | **И**          | Нет защиты попытки                                                     | + attemptToken                             |
| `POST .../answers`                 | Ответ               | Public → API           | то же                  | E-2     | AttemptAnswer      | **И**          | Нет токена/идемпотентности                                             | + token, 409 на повтор                     |
| `POST .../finish`                  | Финиш               | Public → API           | то же                  | E-2     | TestAttempt        | **И**          | Возврат promoCodeId                                                    | Только issuance status                     |
| `POST /public/promocodes/validate` | Проверка кода       | **Заявлен public**     | Должен быть Commerce   | E-3/E-5 | PromoCode          | **И**          | Одна позиция; публичный доступ                                         | → `/integrations/commerce/...`, multi-line |
| `POST /public/promocodes/activate` | Активация           | **Аноним public**      | Нарушает C1/C2         | E-3/E-5 | PromoCode          | **Искл**       | Критично: анонимная активация                                          | Только `POST .../purchases`                |




### Системные проблемы черновика

1. Два `servers` (`/admin/v1`, `/public/v1`) + пути `/public/...` → неоднозначные URL.
2. Нет `securitySchemes` / разделения контуров доверия.
3. `ProblemResponse.status` как string — против RFC 9457 (нужен integer).
4. Русские enum (`Создан`, `Доступен_к_активации`) ≠ доменные `CREATED` / `READY_TO_ACTIVATE`.
5. `DeliveryStatus`: «Отправлена» смешивает accept и delivery.
6. Нет контракта всех продаж (E-6).
7. Нет webhook почты.
8. Нет `operationId` у операций.

---



## Часть 3. Реестр проектируемых REST-операций


| operationId               | Актор    | Метод | Путь                                         | Назначение             | Данные                     | Security                    | Успех   | Ошибки                      |
| ------------------------- | -------- | ----- | -------------------------------------------- | ---------------------- | -------------------------- | --------------------------- | ------- | --------------------------- |
| listPublicProducts        | Public   | GET   | `/public/products`                           | Каталог                | pagination, productGroupId | —                           | 200     | 400,429,500,503             |
| getPublicProduct          | Public   | GET   | `/public/products/{id}`                      | Карточка               | productId                  | —                           | 200     | 404,429,500                 |
| listPublicOnlineTests     | Public   | GET   | `/public/tests`                              | Опубликованные тесты   | pagination                 | —                           | 200     | 400,500                     |
| getPublishedTestVersion   | Public   | GET   | `/public/tests/{id}/published-version`       | Вопросы без `correct`  | testId                     | —                           | 200     | 404,500                     |
| createTestAttempt         | Public   | POST  | `/public/test-attempts`                      | Старт                  | versionId → attemptToken   | —                           | 201     | 400,404,409,422,500         |
| getTestAttempt            | Public   | GET   | `/public/test-attempts/{id}`                 | Статус/результат       | X-Attempt-Token            | token                       | 200     | 401,403,404,500             |
| submitAttemptAnswer       | Public   | POST  | `.../answers`                                | Ответ                  | questionId, optionId       | token + Idempotency-Key     | 204     | 400,401,403,404,409,422,500 |
| finishTestAttempt         | Public   | POST  | `.../finish`                                 | Завершение             | recipientEmail             | token + Idempotency-Key     | 200     | 400,401,403,404,409,422,500 |
| validatePromoCodeForOrder | Commerce | POST  | `/integrations/commerce/promocodes/validate` | Применимость           | code + items[]             | X-API-Key                   | 200     | 400,401,403,422,429,500     |
| confirmPurchase           | Commerce | POST  | `/integrations/commerce/purchases`           | Покупка ± активация    | purchase + lines           | X-API-Key + Idempotency-Key | 201/200 | 400,401,403,409,422,500     |
| submitSalesBatch          | Commerce | POST  | `/integrations/commerce/sales`               | Все продажи / baseline | batch                      | X-API-Key + Idempotency-Key | 202     | 400,401,403,409,422,500     |
| receiveMailProviderEvent  | Provider | POST  | `/integrations/mail/provider-events`         | Статусы письма         | provider event             | X-Provider-Signature        | 202     | 400,401,403,409,422,500     |


**Админ REST:** не вводится. Отмена промокода, права, деактивация сотрудника — BPMSoft + Permission. `ACCOUNT_DEACTIVATE` — **открытый вопрос** согласования с матрицей бэклога.

---



## Часть 4. Реестр асинхронных сообщений


| Сообщение                   | Тип          | Source → Consumer  | Канал                                    | Payload (суть)                                  | Доставка             | Дедуп / идемпотентность     | Ошибки                  |
| --------------------------- | ------------ | ------------------ | ---------------------------------------- | ----------------------------------------------- | -------------------- | --------------------------- | ----------------------- |
| PromoDispatchRequested      | Command      | Core → Worker/CES  | `promocodes.dispatch.requested.v1`       | promoCodeId, ground, email, deadline, attempt=1 | Queue, at-least-once | promoCodeId+attemptNumber   | retry→DLQ [предложение] |
| PromoDispatchRetryRequested | Command      | Core → Worker      | `promocodes.dispatch.retry.requested.v1` | promoCodeId, attempt≥2, reason                  | Queue, at-least-once | promoCodeId+attemptNumber   | то же                   |
| PromoDispatchTimeoutCheck   | Command      | Scheduler → Worker | `promocodes.dispatch.timeout.check.v1`   | promoCodeId, deadline                           | Queue                | повторный check = no-op     | DLQ при системных сбоях |
| PromoValidityExpireCheck    | Command      | Scheduler → Worker | `promocodes.validity.expire.check.v1`    | promoCodeId, expiresAt                          | Queue                | no-op если уже терминальный | то же                   |
| PromoCodeActivated          | Domain event | Core → subscribers | `promocodes.activated.v1`                | promoCodeId, purchaseId, discountTotal          | Topic, at-least-once | source+id                   | redelivery ok           |


**Вне AsyncAPI брокера:** HTTP webhook провайдера (см. OpenAPI). CES→ядро — внутренняя операция.

### Жизненные циклы (согласование)

**PromoCode:** `CREATED → READY_TO_ACTIVATE → ACTIVATED`; терминалы `CANCELLED`, `ANNULLED`.

**PromoSendAttempt:** `CREATED → ACCEPTED_BY_PROVIDER → DELIVERED | FAILED`.

Правила 1–10 из задания (§9) приняты как инварианты контракта.

---



## Часть 5–6. YAML-файлы

- `[../openapi.yaml](../openapi.yaml)`
- `[../asyncapi.yaml](../asyncapi.yaml)`

---



## Часть 7. Трассировка требований


| Эпик    | Сценарий                 | Актор C1               | Контейнеры C2                       | REST / Message              | Сущность                          | Инвариант                                         |
| ------- | ------------------------ | ---------------------- | ----------------------------------- | --------------------------- | --------------------------------- | ------------------------------------------------- |
| E-1     | Ввод результатов турнира | Сотрудник              | AdminClient / Mobile → Core         | *(нет REST)* BPMSoft UI     | Tournament, GameSession, GameTurn | Баллы считает ядро; explainer/guesser раздельно   |
| E-2     | Публикация теста         | Сотрудник              | AdminClient → Core                  | *(нет REST)*                | OnlineTest, TestVersion           | Черновик не публичен; successThreshold обязателен |
| E-2     | Прохождение теста        | Пользователь теста     | Web/Mobile → API → Core             | public test-attempts*       | TestAttempt, AttemptAnswer        | Без `correct` до finish; score считает сервер     |
| E-3     | Выдача промокода         | Ядро (после GAME/TEST) | Core → Rabbit → Worker → CES → Mail | Async dispatch.*            | PromoCode, PromoSendAttempt       | Одно основание GAME                               |
| E-3     | Статусы письма           | Провайдер              | Mail → CES → Core                   | `receiveMailProviderEvent`  | PromoSendAttempt                  | accept ≠ delivered; дедуп event id                |
| E-3     | Аннуляция                | Планировщик            | Scheduler → Rabbit → Worker → Core  | timeout/expire checks       | PromoCode                         | DISPATCH_TIMEOUT / VALIDITY_EXPIRED               |
| E-3/E-5 | Проверка кода            | Торговый контур        | Commerce → API → Core               | `validatePromoCodeForOrder` | PromoCode, Product                | Multi-line; цена запроса не авторитетна           |
| E-3/E-5 | Активация                | Торговый контур        | Commerce → API → Core               | `confirmPurchase`           | Purchase, PromoCode               | Только READY_TO_ACTIVATE; однократно              |
| E-4     | Каталог                  | Покупатель             | Web/Mobile → API → Core             | `list/getPublicProduct*`    | Product, ProductGroup             | Только published; без theme                       |
| E-6     | Все продажи              | Торговый контур        | Commerce → API → Core               | `submitSalesBatch`          | Purchase, PurchaseItem            | В т.ч. без кода + BASELINE                        |
| E-6     | Отчёты R-1–R-4           | Владелец               | AdminClient → Insight               | *(нет REST)*                | агрегаты                          | Без сравнения среднего чека участник/неучастник   |
| E-7     | Роли/сессии              | Владелец/Сотрудник     | AdminClient → Core                  | *(нет REST)*                | Role, Permission, AdminSession    | EMPLOYEE, OWNER; без «Администратор»              |


