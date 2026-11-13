# Фаза 4. Связи, разделы, детали, рабочее место

## 1. Карта 32 UML-связей → lookup-колонки

Все связи 1:N реализованы lookup-колонкой **на дочернем объекте** (правило BPMSoft:
ссылка хранится у «многих»). Колонки уже заведены в `02-objects.md` — здесь
сверка смыслов, кратностей и мест, где связь «не гарантируетсяlookup'ом».

| № | Связь UML | Реализация | Кратность | Комментарий |
|---|---|---|---|---|
| 01 | Role → EmployeeAccount | `ChuEmployeeAccount.Role` → ChuRole | N:1, обяз. | Одна роль на сотрудника (I-38) |
| 02 | Role ↔ Permission | объект-связка `ChuRolePermission` | N:M | технический объект, не бизнес-сущность |
| 03 | EmployeeAccount → AdminSession | `ChuAdminSession.EmployeeAccount` → ChuEmployeeAccount | N:1, обяз. | |
| 04 | ProductGroup → Product | `ChuProduct.ProductGroup` → ChuProductGroup | N:1, обяз. | |
| 05 | Purchase → PurchaseItem | `ChuPurchaseItem.Purchase` → ChuPurchase | N:1, обяз. | ≥1 позиции — при завершении (I-32) |
| 06 | PurchaseItem → Product | `ChuPurchaseItem.Product` → ChuProduct | N:1, обяз. | |
| 07 | Tournament → Product | `ChuTournament.Product` → ChuProduct | N:1, обяз. | один товар на турнир (I-01) |
| 08 | Tournament → GameSession | `ChuGameSession.Tournament` → ChuTournament | N:1, обяз. | |
| 09 | GameSession → SessionParticipant | `ChuSessionParticipant.GameSession` → ChuGameSession | N:1, обяз. | состав фиксируется после IN_PROGRESS (I-03) |
| 10 | GameSession → GameRound | `ChuGameRound.GameSession` → ChuGameSession | N:1, обяз. | |
| 11 | GameRound → GameTurn | `ChuGameTurn.GameRound` → ChuGameRound | N:1, обяз. | |
| 12 | GameTurn → Explainer | `ChuGameTurn.Explainer` → ChuSessionParticipant | N:1, обяз. | участник той же сессии (I-05) |
| 13 | GameTurn → Guesser | `ChuGameTurn.Guesser` → ChuSessionParticipant | N:0..1 | `Guessed=true` ⇔ Guesser заполнен (I-06) |
| 14 | GameTurn → Word | `ChuGameTurn.Word` → ChuWord | N:1, обяз. | |
| 15 | GameTurn → ScoringRule | `ChuGameTurn.ScoringRule` → ChuScoringRule | N:1, обяз. | снимок правила на момент хода (I-07/I-08) |
| 16 | WordCategory → Word | `ChuWord.WordCategory` → ChuWordCategory | N:1, обяз. | |
| 17 | WordCategory → ScoringRule | `ChuScoringRule.WordCategory` → ChuWordCategory | N:1, обяз. | |
| 18 | GameRound → RoundWinner | `ChuGameRound.RoundWinner` → ChuSessionParticipant | N:0..1 | победитель — участник сессии раунда (I-09) |
| 19 | GameSession → SessionWinner | `ChuGameSession.SessionWinner` → ChuSessionParticipant | N:0..1 | добавлена проходом 2; I-09/I-10 |
| 20 | OnlineTest → TestVersion | `ChuTestVersion.OnlineTest` → ChuOnlineTest | N:1, обяз. | |
| 21 | TestVersion → TestQuestion | `ChuTestQuestion.TestVersion` → ChuTestVersion | N:1, обяз. | |
| 22 | TestQuestion → AnswerOption | `ChuAnswerOption.TestQuestion` → ChuTestQuestion | N:1, обяз. | ≥2 варианта при публикации (I-13) |
| 23 | TestVersion → TestAttempt | `ChuTestAttempt.TestVersion` → ChuTestVersion | N:1, обяз. | только опубликованная версия (I-15) |
| 24 | TestAttempt → AttemptAnswer | `ChuAttemptAnswer.TestAttempt` → ChuTestAttempt | N:1, обяз. | |
| 25 | AttemptAnswer → TestQuestion | `ChuAttemptAnswer.TestQuestion` → ChuTestQuestion | N:1, обяз. | вопрос версии попытки (I-17) |
| 26 | AttemptAnswer → AnswerOption | `ChuAttemptAnswer.AnswerOption` → ChuAnswerOption | N:1, обяз. | вариант этого вопроса (I-17) |
| 27 | TestVersion → ProductGroup | `ChuTestVersion.ProductGroup` → ChuProductGroup | N:0..1 | обязательна у PUBLISHED (I-18, проектное) |
| 28 | PromoCode → PromoSendAttempt | `ChuPromoSendAttempt.PromoCode` → ChuPromoCode | N:1, обяз. | повторные отправки — новые записи |
| 29 | PromoCode → ProductGroup | `ChuPromoCode.ProductGroup` → ChuProductGroup | N:1, обяз. | I-20 |
| 30 | GameSession ↔ PromoCode (GAME) | `ChuPromoCode.GameSession` → ChuGameSession | 0..1 | XOR с `TestAttempt` (I-21) |
| 31 | TestAttempt ↔ PromoCode (TEST) | `ChuPromoCode.TestAttempt` → ChuTestAttempt | 0..1 | XOR с `GameSession`; только успешная попытка с email (I-19) |
| 32 | PromoCode ↔ Purchase | `ChuPurchase.PromoCode` → ChuPromoCode | 0..1 | ≤1 код на покупку; ≤1 активация кода (I-30/I-37) |

### Связи, которые lookup НЕ гарантирует — фиксировать в отчёте

| Инвариант | Почему недостаточно lookup | Что делать |
|---|---|---|
| XOR основания промокода (I-21): ровно одно из GameSession/TestAttempt | Два независимых необязательных lookup | Бизнес-процесс/валидация при сохранении; в отчёте — «требуется серверная проверка» |
| `Source` соответствует основанию (GAME↔GameSession, TEST↔TestAttempt) | Lookup не связывает два поля | Та же проверка |
| Победитель раунда/сессии — участник именно этой сессии (I-09) | Lookup показывает всех участников | Фильтр/валидация в процессе; как минимум — контроль при тестировании |
| Уникальность (попытка, вопрос) в ChuAttemptAnswer (I-17); уникальность Code промокода (I-20); уникальность пары RolePermission | Lookup не создаёт уникальный индекс | Уникальный индекс в конфигураторе, если доступен; иначе «требуется проверка БД» |
| 1:1 GameSession↔PromoCode, TestAttempt↔PromoCode (одно основание → не более одного кода) | Обратная сторона не контролируется | Уникальный индекс на `GameSession`/`TestAttempt` в ChuPromoCode, если поддерживается |
| Неизменность опубликованной версии теста (I-14); терминальные статусы промокода (I-26) | Права на колонки не выражают lifecycle | Бизнес-правило/процесс; до реализации — честный статус |

## 2. Разделы (корневые)

Мастер разделов → для каждого корневого объекта раздел + карточка.
Рекомендуемый набор (по ТЗ §7):

| Раздел | Объект раздела | Основные поля карточки | Детали на карточке |
|---|---|---|---|
| Турниры | ChuTournament | Name, HeldAt, Status, Product | ChuGameSession (сессии) |
| Словарь игр | ChuWordCategory | Name, Difficulty | ChuWord (слова), ChuScoringRule (правила) |
| Онлайн-тесты | ChuOnlineTest | Name | ChuTestVersion (версии) |
| Каталог товаров | ChuProductGroup | Name | ChuProduct (товары группы) |
| Промокоды | ChuPromoCode | Code, Source, Status, ProductGroup, DiscountPercent, ключевые даты | ChuPromoSendAttempt (попытки отправки) |
| Покупки | ChuPurchase | PurchasedAt, AmountBeforeDiscount, DiscountAmount, FinalAmount, PromoCode | ChuPurchaseItem (позиции) |
| Администрирование ProfIT | ChuEmployeeAccount | Login, FullName, Email, Active, Role | ChuAdminSession (сеансы) |

Альтернатива для каталога: раздел на `ChuProduct`, если удобнее работать
с товарами напрямую — тогда деталь `ChuProductGroup` и ссылки на группу.
Выбор зафиксировать в отчёте.

## 3. Детали (вложенность)

Деталь = объект, показанный таблицей внутри карточки родителя.
Мастер деталей → «Зарегистрировать объект как деталь» → выбрать вид
(«со страницей добавления» или «с редактируемым реестром») → разместить на
карточке родителя → **переименовать сгенерированные схемы** (см. README,
правило 4).

| На карточке | Детали |
|---|---|
| ChuTournament | ChuGameSession |
| ChuGameSession | ChuSessionParticipant, ChuGameRound |
| ChuGameRound | ChuGameTurn |
| ChuWordCategory | ChuWord, ChuScoringRule |
| ChuOnlineTest | ChuTestVersion |
| ChuTestVersion | ChuTestQuestion, ChuTestAttempt |
| ChuTestQuestion | ChuAnswerOption |
| ChuTestAttempt | ChuAttemptAnswer |
| ChuProductGroup | ChuProduct |
| ChuProduct | ChuTournament (турниры по игре), ChuTestVersion (версии с этой группой), ChuPromoCode (коды группы) — по необходимости |
| ChuPromoCode | ChuPromoSendAttempt |
| ChuPurchase | ChuPurchaseItem |
| ChuRole | ChuEmployeeAccount, ChuRolePermission |
| ChuPermission | ChuRolePermission |
| ChuEmployeeAccount | ChuAdminSession |

Вложенность трёх уровней (Тест → Версия → Вопрос → Вариант) в одной карточке
может не помещаться — тогда деталь открывает карточку элемента, а у того
свои детали (переход по записи детали). Это допустимо — зафиксировать в отчёте.

## 4. Рабочее место «ProfIT»

Настройка рабочих мест → создать/переименовать рабочее место `ProfIT`,
добавить разделы: Турниры, Словарь игр, Онлайн-тесты, Каталог товаров,
Промокоды, Покупки, Администрирование ProfIT.
Проверить, что разделы видны в навигации текущего пользователя.
Роли и права на разделы — отдельно (фаза BPMN/ролей практики), здесь
зафиксировать факт создания рабочего места.

## Контроль фазы 4

- [ ] Все 32 связи имеют lookup-колонку; «не гарантируемые» связи записаны.
- [ ] Разделы созданы, карточки содержат нужные поля (обязательность/видимость
      настраивается в мастере раздела).
- [ ] Детали зарегистрированы, схемы и страницы переименованы, 3 привязки
      (`SysDetail_`, `SysModuleEdit_`, `SysModuleEntity_`) переименованы.
- [ ] Рабочее место ProfIT доступно, разделы видны.
- [ ] Скриншоты: мастер разделов, карточка раздела, мастер деталей, деталь,
      рабочее место.
