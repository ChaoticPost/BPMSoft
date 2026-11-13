#include "header6.typ"
// Практическая работа №6 - реализация доменной модели ProfIT в BPMSoft.
// Интегрирован с финальным отчётом ProfIT_Practice_6_Final.docx (срез 13.11.2026 23:18):
// 44 реальных снимка стенда, фактические имена схем, статусы и результаты проверок.
#set page(paper: "a4", margin: (left: 2.5cm, right: 1.7cm, top: 2.1cm, bottom: 2cm), numbering: "1")
#set text(font: "Times New Roman", size: 12pt, lang: "ru")
#show table: set text(size: 9.5pt)
#set par(justify: true, first-line-indent: (amount: 1.25cm, all: true), spacing: 0.7em)
#set heading(numbering: none)
#set table(stroke: 0.45pt, inset: 4pt)
#set figure(supplement: "Рисунок")

// Реальный снимок стенда: краткое пояснение перед рисунком
// (соответствие доменной модели + результат проверки), затем сам снимок.
// Номер рисунка берётся из имени файла (risNN.png → N + 1): рисунок 1 -
// доменная модель, снимки стенда нумеруются со сдвигом на единицу.
#let fig(file, title, desc, model, result) = block(breakable: false)[
  #text[#model #result]
  #v(4pt)
  #figure(image("images/p6/" + file, width: 90%), numbering: none,
    caption: [Рисунок #(int(file.slice(3, 5)) + 1). #title])
  #v(6pt)
]

#outline(title: "Оглавление", depth: 3)
#pagebreak()

= Введение
Информационная система ProfIT предназначена для поддержки продвижения настольных игр и паззлов через офлайн-турниры, онлайн-тестирование и персональные промокоды.

Практическая работа №6 переносит доменную модель на учебный стенд BPMSoft.

В отчёте описано, что настроено на стенде, и что из требований модели пока не реализовано.

== Цель и задачи
Цель - перенести доменную модель ProfIT в объекты, поля, справочники, разделы и детали BPMSoft.

#set page(paper: "a3", margin: 1.2cm)
= Доменная модель
Полная диаграмма приведена далее.
#v(1fr)
#align(center)[#image("domennaya/Domennaya model.svg", height: 34cm)]
#v(0.4cm)
#align(center)[#text(size: 11pt)[Рисунок 1. Доменная модель MVP ProfIT.]]
#v(1fr)
#set page(paper: "a4", margin: (left: 2.5cm, right: 1.7cm, top: 2.1cm, bottom: 2cm), numbering: "1")

= Анализ существующей конфигурации
Ранее был создан пакет `Chugunova_package`, рабочее место ProfIT с «Контактами» и проектная схема `ChuProduct​Group`. Остальные предметные объекты из перечня задания в пользовательской конфигурации не обнаружены. Поэтому существующие элементы использованы повторно, а новые создавались после проверки реестра схем.

Схема `ChuProduct​Group` наследовала `BaseEntity` и не имела опубликованной таблицы. Для справочного назначения настроен `BaseLookup`, отображаемое поле `Name`, выполнена публикация и регистрация в справочниках.

#fig("ris01.png", [Исходная навигация ProfIT],
  [На снимке показано рабочее место ProfIT в исходном состоянии: в левой навигационной панели доступны только штатные разделы, проектные разделы ещё не подключены.],
  [Рабочее место проекта из доменной модели.],
  [])

#fig("ris02.png", [Исходный пакет Chugunova_package],
  [На снимке в конфигураторе выбран пользовательский пакет `Chugunova_package`, в котором на момент начала работ присутствовала только схема `ChuProduct​Group`.],
  [Пакет хранения проектных схем и сущность `Product​Group`.],
  [Пакет переиспользован, новый не создавался.])

#fig("ris03.png", [Исходная схема товарной группы],
  [На снимке показана карточка схемы `ChuProduct​Group` до доработки: в качестве родителя указан `BaseEntity`, отображаемое значение не настроено.],
  [Атрибут `Product​Group.name`.],
  [Схема существовала без опубликованной таблицы.])

#fig("ris08.png", [Исходная карточка рабочего места],
  [На снимке показана карточка рабочего места ProfIT с ранее подключённым разделом «Контакты».],
  [Рабочее место проекта.],
  [Раздел «Контакты» сохранён.])

#pagebreak()
= Пользовательский пакет
В пакете заданы издатель `Chugunova`, префикс схем `Chu`, рабочий пакет `Chugunova_package`. Зависимость - `SalesEnterprise_​Marketing_​ServiceEnt`; пакета `Constructor` в конфигурации нет, дублирующий пакет не создавался.

Создано 18 предметных схем и 9 статусных справочников, `Product` расширен замещением. Коды схем в пакете не дублируются. Исходная `ChuProduct​Group` доработана, а не создана заново.

= Объекты и типы данных
У объектов наследуются `Name` и `Description`; доменный `name` хранится в `Name`, для `text`, `displayName` и `code` заведены отдельные поля. У `Product` переиспользованы штатные `Name`, `Description`, `Price`, добавлены `ChuPublished` и `ChuProduct​Group`. Поле `theme` не создавалось.

Обнаружен нюанс BPMSoft: обязательное числовое поле считает ноль незаполненным. У сумм, скидок и очков, где ноль допустим, обязательность снята; нулевая скидка сохраняется. Автоматических проверок диапазонов нет.

== Выбор реализации по сущностям
По каждой сущности выбрано: новый объект `Chu*`, замещение штатного объекта или переиспользование штатного механизма.

#table(columns: (0.5fr, 1.7fr, 2.4fr, 2.7fr), table.header([№], [Сущность модели], [Решение], [Обоснование]),
  [1], [Product​Group], [новый `ChuProduct​Group` (справочник)], [проектная классификация; штатного эквивалента с нужной семантикой нет],
  [2], [Product], [замещение штатного `Product`], [штатный товар покрывает имя/описание/цену; добавлены `ChuPublished`, `ChuProduct​Group`],
  [3-17], [Tournament…Purchase​Item (18 предметных сущностей)], [новые объекты `Chu*`], [предметная специфика ProfIT; штатных эквивалентов нет],
  [18], [Employee​Account], [штатный `SysAdmin​Unit` / `Vw​System​Users`], [учётные записи и аутентификация - платформенный механизм; собственное хранение паролей не создавалось],
  [19], [Role], [штатный `SysAdmin​Unit` / `SysAdminUnit​In​Role`], [организационные и функциональные роли платформы],
  [20], [Permission], [штатные `SysAdmin​Operation` / `Sys​Entity​Schema​Operation​Right`], [полномочия и права на схемы - штатная модель доступа],
  [21], [Admin​Session], [штатный `SysUser​Session` / журнал аудита], [сеансы и аудит ведёт платформа],
)

Ролевая матрица здесь не проверялась - это результат практики №7.

#fig("ris07.png", [Штатные административные механизмы],
  [На снимке показан дизайнер системы: разделы управления пользователями, ролями, правами доступа и журналом аудита.],
  [Сущности `Employee​Account`, `Role`, `Permission`, `Admin​Session` закрыты штатными механизмами.],
  [Ролевая матрица здесь не настраивалась.])

#pagebreak()
= Разделы и рабочее место
В рабочее место ProfIT добавлены «Турниры», «Онлайн-тесты», «Продукты», «Промокоды» и «Покупки»; «Контакты» оставлены. У реестров настроены колонки, у карточек - основные поля; слишком узкие колонки четырёх новых реестров исправлены. Валюта и единица - штатные справочники.

На сгенерированной странице турнира терялись поля - восстановлены название, дата, статус, товар и деталь игровых сессий.

#fig("ris22.png", [Турнир с игровой сессией],
  [На снимке показана карточка раздела «Турниры»: название турнира, дата и время проведения, статус `IN_PROGRESS`, связанный товар и деталь со связанной игровой сессией.],
  [Поля `Tournament.name`, `heldAt`, `status`, `product` и связь `Tournament` → `Game​Session`.],
  [Карточка восстановлена после ошибки генерации.])

#fig("ris37.png", [Каталог товаров с записями],
  [На снимке показан реестр штатного раздела «Продукты» с учебными товарами: видны колонки цены, товарной группы и признака публикации, в навигации - пять проектных разделов ProfIT.],
  [Сущности `Product` и `Product​Group`.],
  [Пять разделов ProfIT доступны в навигации.])

#fig("ris38.png", [Реестр турниров],
  [На снимке показан реестр раздела «Турниры» с учебными записями: названия, даты проведения, статусы и связанные товары.],
  [Сущность `Tournament`.],
  [Создание и редактирование проверены.])

#fig("ris39.png", [Реестр онлайн-тестов],
  [На снимке показан реестр раздела «Онлайн-тесты» с учебными записями и датами создания.],
  [Сущность `Online​Test`.],
  [Создание и редактирование проверены.])

#fig("ris40.png", [Реестр промокодов],
  [На снимке показан реестр раздела «Промокоды»: код, адрес получателя, статус и товарная группа по каждой учебной записи.],
  [Сущность `Promo​Code`.],
  [Реальные адресаты не использовались.])

#fig("ris41.png", [Реестр покупок],
  [На снимке показан реестр раздела «Покупки» с учебными записями: даты покупки и три отдельных денежных показателя - сумма до скидки, скидка и итог.],
  [Атрибуты `Purchase.purchasedAt`, `amountBeforeDiscount`, `discountAmount`, `finalAmount`.],
  [Нулевая скидка сохраняется; автопересчёта нет.])

#pagebreak()
= Детали и связи
Создано 11 деталей. Добавление проверено из карточки родителя: ссылка на родителя заполняется автоматически, после сохранения строка появляется в детали. Технические имена деталей не переименовывались.

Проверенные связи деталей:

#table(columns: (1.4fr, 1.8fr, 3.2fr), table.header([Родитель], [Деталь], [Обратная ссылка]),
  [Турнир], [Игровые сессии], [`ChuGame​Session.ChuTournament`],
  [Сессия], [Участники], [`ChuSession​Participant.ChuGame​Session`],
  [Сессия], [Раунды], [`ChuGame​Round.ChuGame​Session`],
  [Раунд], [Ходы], [`ChuGame​Turn.ChuRound`],
  [Онлайн-тест], [Версии], [`ChuTest​Version.ChuOnline​Test`],
  [Версия], [Вопросы], [`ChuTest​Question.ChuTest​Version`],
  [Вопрос], [Варианты ответа], [`ChuAnswer​Option.ChuQuestion`],
  [Версия], [Попытки], [`ChuTest​Attempt.ChuTest​Version`],
  [Попытка], [Ответы], [`ChuAttempt​Answer.ChuTest​Attempt`],
  [Промокод], [Попытки отправки], [`ChuPromoSend​Attempt.ChuPromoCode`],
  [Покупка], [Позиции], [`ChuPurchase​Item.ChuPurchase`],
)

#pagebreak()
== Карточки родителей и деталей

#fig("ris23.png", [Игровая сессия с участниками и раундами],
  [На снимке показана карточка игровой сессии: ссылка на родительский турнир, даты начала и окончания, статус, а также две детали - участники и раунды.],
  [Связи `Game​Session` → `Session​Participant` и `Game​Session` → `Game​Round`.],
  [Обе детали на карточке сессии.])

#fig("ris24.png", [Раунд с игровым ходом],
  [На снимке показана карточка игрового раунда: ссылка на родительскую сессию, номер раунда, статус и деталь с игровыми ходами.],
  [Атрибуты `Game​Round.gameSession`, `number`, `status`, `winner` и связь `Game​Round` → `Game​Turn`.],
  [Вложенная деталь работает.])

#fig("ris25.png", [Карточка игрового хода],
  [На снимке показана карточка игрового хода: дата и время хода, результат угадывания, способ представления, объясняющий и угадывающий, слово, правило начисления и два раздельных поля очков.],
  [Поля `GameTurn`, включая раздельные `explainerPoints` и `guesserPoints`.],
  [Очки 2 и 1 сохранены; единое поле `points` не использовалось.])

#fig("ris26.png", [Онлайн-тест и версии],
  [На снимке показана карточка онлайн-теста с деталью версий теста.],
  [Связь `Online​Test` → `Test​Version`.],
  [])

#fig("ris27.png", [Версия теста с вопросами и попытками],
  [На снимке показана карточка версии теста: номер версии, статус `DRAFT`, порог успешности, целевая товарная группа и две детали - вопросы и попытки.],
  [Связи `Test​Version` → `Test​Question` и `Test​Version` → `Test​Attempt`.],
  [Версия в `DRAFT`, не публиковалась.])

#fig("ris28.png", [Вопрос с вариантами ответа],
  [На снимке показана карточка вопроса теста: текст вопроса и деталь с двумя связанными вариантами ответа.],
  [Связь `Test​Question` → `Answer​Option`.],
  [])

#fig("ris29.png", [Правильный вариант ответа],
  [На снимке показана карточка варианта ответа: ссылка на родительский вопрос, текст варианта и установленный флаг правильности.],
  [Атрибуты `Answer​Option.question`, `text`, `correct`.],
  [])

#fig("ris30.png", [Попытка тестирования с ответом],
  [На снимке показана карточка попытки тестирования: ссылка на версию теста, синтетический email участника, время начала, нулевой результат и деталь с ответом попытки.],
  [Связь `Test​Attempt` → `Attempt​Answer`.],
  [Запись внесена вручную - движок тестирования не запускался.])

#fig("ris31.png", [Ответ попытки],
  [На снимке показана карточка ответа попытки: ссылки на попытку, вопрос и выбранный вариант, время ответа и флаг правильности.],
  [Атрибуты `Attempt​Answer.testAttempt`, `question`, `selectedAnswer`, `answeredAt`, `correct`.],
  [Неверный ответ согласуется с нулевым результатом попытки.])

#pagebreak()
== Автоматическая привязка родителя

#fig("ris42.png", [Автоматическая ссылка на турнир до сохранения],
  [На снимке показано создание новой игровой сессии кнопкой добавления из детали турнира: поле турнира уже заполнено системой.],
  [Обязательная ссылка `Game​Session.tournament`.],
  [Заполнена автоматически до сохранения.])

#fig("ris43.png", [Дочерняя запись после сохранения и обновления],
  [На снимке показана карточка турнира после сохранения и повторной загрузки страницы: в детали отображаются ранее существовавшая и новая игровая сессия.],
  [Связь `Tournament` → `Game​Session`.],
  [Новая запись у правильного родителя.])

#pagebreak()
= Справочники и наполнение
Девять статусных справочников, 28 значений, дублей нет. Статусы сессии и раунда - разные справочники, у них разное назначение.

#table(columns: (2.1fr, 1.9fr, 3.1fr, 0.6fr, 1.0fr, 0.85fr), table.header([Объект], [Поля], [Значения], [Кол-во], [Статус], [Рисунки]),
  [`ChuTournament​Status`], [`Name`], [`PLANNED`, `IN_PROGRESS`, `COMPLETED`], [3], [`EXISTS_OK`], [10],
  [`ChuGame​Session​Status`], [`Name`], [`DRAFT`, `IN_PROGRESS`, `COMPLETED`], [3], [`EXISTS_OK`], [11],
  [`ChuGame​Round​Status`], [`Name`], [`DRAFT`, `IN_PROGRESS`, `COMPLETED`], [3], [`EXISTS_OK`], [12],
  [`ChuRepresentation​Method`], [`Name`], [`PANTOMIME`, `DRAWING`, `VERBAL`], [3], [`EXISTS_OK`], [13],
  [`ChuTest​Version​Status`], [`Name`], [`DRAFT`, `PUBLISHED`, `ARCHIVED`], [3], [`EXISTS_OK`], [14],
  [`ChuPromo​Source`], [`Name`], [`GAME`, `TEST`], [2], [`EXISTS_OK`], [15],
  [`ChuPromo​Status`], [`Name`], [`CREATED`, `READY_TO_ACTIVATE`, `ACTIVATED`, `CANCELLED`, `ANNULLED`], [5], [`EXISTS_OK`], [16],
  [`ChuDelivery​Status`], [`Name`], [`CREATED`, `ACCEPTED_BY_PROVIDER`, `DELIVERED`, `FAILED`], [4], [`EXISTS_OK`], [17],
  [`ChuAnnulment​Reason`], [`Name`], [`VALIDITY_EXPIRED`, `DISPATCH_TIMEOUT`], [2], [`EXISTS_OK`], [18],
  [`ChuProduct​Group`], [`Name`, `Description`], [Настольные игры; Пазлы], [2], [`EXISTS_OK`], [6, 7],
  [`ChuWord​Category`], [`Name`, `ChuDifficulty`], [Животные; Предметы], [2], [`EXISTS_OK`], [20],
  [`ChuWord`], [`ChuText`, `ChuActive`, `ChuWord​Category`], [Кот; Поезд], [2], [`EXISTS_OK`], [21],
  [`ChuScoring​Rule`], [категория, метод, очки, дата], [`VERBAL`; 2/1; 01.11.2026], [1], [`EXISTS_OK`], [22],
)

Перечисления E-7 (`RoleCode`, `PermissionCode`, `Admin​SessionStatus`) отдельно не создавались - они закрыты штатными механизмами прав.

#pagebreak()
== Снимки статусных справочников

#fig("ris09.png", [Статусы турниров ProfIT],
  [На снимке показан справочник статусов турнира с записями `PLANNED`, `IN_PROGRESS` и `COMPLETED`.],
  [Перечисление `TournamentStatus`; ссылка `ChuStatus` объекта `ChuTournament`.],
  [Дублей нет.])

#fig("ris10.png", [Статусы игровых сессий ProfIT],
  [На снимке показан справочник статусов игровой сессии с записями `DRAFT`, `IN_PROGRESS` и `COMPLETED`.],
  [Перечисление `GameSessionStatus`; ссылка `ChuStatus` объекта `ChuGame​Session`.],
  [Дублей нет.])

#fig("ris11.png", [Статусы игровых раундов ProfIT],
  [На снимке показан справочник статусов игрового раунда с записями `DRAFT`, `IN_PROGRESS` и `COMPLETED`.],
  [Перечисление `GameRoundStatus`; ссылка `ChuStatus` объекта `ChuGame​Round`.],
  [Дублей нет.])

#fig("ris12.png", [Способы представления ProfIT],
  [На снимке показан справочник способов представления с записями `PANTOMIME`, `DRAWING` и `VERBAL`.],
  [Перечисление `RepresentationMethod`; ссылка `ChuMethod` объекта `ChuGame​Turn`.],
  [Дублей нет.])

#fig("ris13.png", [Статусы версий теста ProfIT],
  [На снимке показан справочник статусов версии теста с записями `DRAFT`, `PUBLISHED` и `ARCHIVED`.],
  [Перечисление `TestVersionStatus`; ссылка `ChuStatus` объекта `ChuTest​Version`.],
  [Дублей нет.])

#fig("ris14.png", [Основания промокодов ProfIT],
  [На снимке показан справочник оснований промокода с записями `GAME` и `TEST`.],
  [Перечисление `PromoSource`; ссылка `ChuSource` объекта `ChuPromoCode`.],
  [Дублей нет.])

#fig("ris15.png", [Статусы промокодов ProfIT],
  [На снимке показан справочник статусов промокода с записями `CREATED`, `READY_TO_ACTIVATE`, `ACTIVATED`, `CANCELLED` и `ANNULLED`.],
  [Перечисление `PromoStatus`; ссылка `ChuStatus` объекта `ChuPromoCode`.],
  [Дублей нет.])

#fig("ris16.png", [Статусы доставки ProfIT],
  [На снимке показан справочник статусов доставки с записями `CREATED`, `ACCEPTED_BY_PROVIDER`, `DELIVERED` и `FAILED`.],
  [Перечисление `DeliveryStatus`; ссылка `ChuStatus` объекта `ChuPromoSend​Attempt`.],
  [Дублей нет.])

#fig("ris17.png", [Причины аннулирования ProfIT],
  [На снимке показан справочник причин аннулирования с записями `VALIDITY_EXPIRED` и `DISPATCH_TIMEOUT`.],
  [Перечисление `AnnulmentReason`; ссылка `ChuAnnulmentReason` объекта `ChuPromoCode`.],
  [Дублей нет.])

#pagebreak()
== Предметные справочники и карточка товара

#fig("ris04.png", [Опубликованная товарная группа],
  [На снимке показана доработанная схема `ChuProduct​Group`: родитель изменён на `BaseLookup`, в качестве отображаемого поля указано «Название».],
  [`Product​Group.name` в поле `Name`.],
  [`BaseLookup`, опубликована, зарегистрирована.])

#fig("ris05.png", [Наполнение товарных групп],
  [На снимке показано наполнение справочника товарных групп: две записи «Настольные игры» и «Пазлы» с описаниями.],
  [Атрибут `Product​Group.name`.],
  [Две группы доступны для выбора.])

#fig("ris06.png", [Сохранность товарных групп],
  [На снимке показан справочник товарных групп после редактирования и перезагрузки страницы: отображаются обе группы и изменённое описание.],
  [Сущность `Product​Group`.],
  [Изменения пережили перезагрузку.])

#fig("ris18.png", [Карточка товара],
  [На снимке показана карточка учебного товара «настольная игра»: признак публикации, товарная группа, цена 1000, валюта «Рубль» и единица «штук».],
  [Атрибуты `Product.name`, `price`, `published`, `productGroup`; валюта и единица - штатные `Currency` и `Unit`.],
  [Сохранено через интерфейс.])

#fig("ris19.png", [Категории слов],
  [На снимке показан справочник категорий слов с учебными записями «Животные» и «Предметы».],
  [Атрибуты `Word​Category.name` и `difficulty`.],
  [])

#fig("ris20.png", [Справочник слов],
  [На снимке показан справочник слов с учебными записями «Кот» и «Поезд».],
  [Атрибуты `Word.text`, `active`, `wordCategory`.],
  [])

#fig("ris21.png", [Правило начисления],
  [На снимке показан справочник правил начисления с учебной записью: способ `VERBAL`, 2 очка объясняющему и 1 очко угадывающему.],
  [Атрибуты `Scoring​Rule.wordCategory`, `method`, `pointsForExplainer`, `pointsForGuesser`, `activeFrom`.],
  [Очки 2 и 1 раздельно; автоначисления нет.])

#pagebreak()
= Сопоставление с доменной моделью
Все 24 сущности. `EXISTS_OK` - объект есть на стенде и соответствует модели; `REUSE_​STANDARD` - закрыто штатным механизмом.

#text(size: 8.4pt)[
#table(columns: (1.0fr, 1.35fr, 0.95fr, 3.4fr, 0.85fr, 0.45fr, 0.85fr), table.header([Сущность], [Фактический объект], [Реализация], [Поля и связи], [Статус], [Зап.], [Рисунки]),
  [Tournament], [`ChuTournament`], [раздел], [`Name`; `ChuHeldAt`; `ChuStatus` → `ChuTournament​Status`; `ChuProduct` → `Product`], [`EXISTS_OK`], [2], [23, 39, 44],
  [Game​Session], [`ChuGame​Session`], [деталь], [`Name`; `ChuTournament` → `ChuTournament`; `ChuStartedAt`; `ChuFinishedAt`; `ChuStatus` → `ChuGame​Session​Status`; `ChuWinner` → `ChuSession​Participant`], [`EXISTS_OK`], [2], [24, 43, 44],
  [Session​Participant], [`ChuSession​Participant`], [деталь], [`Name`; `ChuGame​Session` → `ChuGame​Session`; `ChuDisplayName`; `ChuContactEmail`], [`EXISTS_OK`], [3], [24],
  [Game​Round], [`ChuGame​Round`], [деталь], [`Name`; `ChuGame​Session` → `ChuGame​Session`; `ChuNumber`; `ChuStatus` → `ChuGame​Round​Status`; `ChuWinner` → `ChuSession​Participant`], [`EXISTS_OK`], [2], [25],
  [Game​Turn], [`ChuGame​Turn`], [деталь], [`Name`; `ChuRound` → `ChuGame​Round`; `ChuPlayedAt`; `ChuGuessed`; `ChuMethod` → `ChuRepresentation​Method`; `ChuExplainerPoints`; `ChuGuesserPoints`; `ChuExplainer` → `ChuSession​Participant`; `ChuGuesser` → `ChuSession​Participant`; `ChuWord` → `ChuWord`; `ChuScoring​Rule` → `ChuScoring​Rule`], [`EXISTS_OK`], [2], [26],
  [Word​Category], [`ChuWord​Category`], [справочник], [`Name`; `ChuDifficulty`], [`EXISTS_OK`], [2], [20],
  [Word], [`ChuWord`], [справочник], [`Name`; `ChuText`; `ChuActive`; `ChuWord​Category` → `ChuWord​Category`], [`EXISTS_OK`], [2], [21],
  [Scoring​Rule], [`ChuScoring​Rule`], [справочник], [`Name`; `ChuWord​Category` → `ChuWord​Category`; `ChuMethod` → `ChuRepresentation​Method`; `ChuPointsForExplainer`; `ChuPointsForGuesser`; `ChuActiveFrom`], [`EXISTS_OK`], [1], [22],
  [Online​Test], [`ChuOnline​Test`], [раздел], [`Name`], [`EXISTS_OK`], [2], [27, 40],
  [Test​Version], [`ChuTest​Version`], [деталь], [`Name`; `ChuOnline​Test` → `ChuOnline​Test`; `ChuVersionNumber`; `ChuStatus` → `ChuTest​Version​Status`; `ChuSuccessThreshold`; `ChuPublishedAt`; `ChuProduct​Group` → `ChuProduct​Group`], [`EXISTS_OK`], [2], [28],
  [Test​Question], [`ChuTest​Question`], [деталь], [`Name`; `ChuTest​Version` → `ChuTest​Version`; `ChuText`], [`EXISTS_OK`], [2], [29],
  [Answer​Option], [`ChuAnswer​Option`], [деталь], [`Name`; `ChuQuestion` → `ChuTest​Question`; `ChuText`; `ChuCorrect`], [`EXISTS_OK`], [3], [30],
  [Test​Attempt], [`ChuTest​Attempt`], [деталь], [`Name`; `ChuTest​Version` → `ChuTest​Version`; `ChuContactEmail`; `ChuStartedAt`; `ChuFinishedAt`; `ChuScore`; `ChuSuccessful`], [`EXISTS_OK`], [2], [31],
  [Attempt​Answer], [`ChuAttempt​Answer`], [деталь], [`Name`; `ChuTest​Attempt` → `ChuTest​Attempt`; `ChuQuestion` → `ChuTest​Question`; `ChuSelectedAnswer` → `ChuAnswer​Option`; `ChuAnsweredAt`; `ChuCorrect`], [`EXISTS_OK`], [2], [32],
  [PromoCode], [`ChuPromoCode`], [раздел], [`Name`; `ChuCode`; `ChuRecipientEmail`; `ChuSource` → `ChuPromo​Source`; `ChuStatus` → `ChuPromo​Status`; `ChuProduct​Group` → `ChuProduct​Group`; `ChuValidityDays`; `ChuDiscountPercent`; `ChuCreatedAt`; `ChuDeliveryDeadlineAt`; `ChuSentAt`; `ChuExpiresAt`; `ChuActivatedAt`; `ChuCancelledAt`; `ChuAnnulledAt`; `ChuCancellationReason`; `ChuAnnulmentReason` → `ChuAnnulment​Reason`; `ChuGame​Session` → `ChuGame​Session`; `ChuTest​Attempt` → `ChuTest​Attempt`], [`EXISTS_OK`], [2], [33, 34, 41],
  [PromoSend​Attempt], [`ChuPromoSend​Attempt`], [деталь], [`Name`; `ChuPromoCode` → `ChuPromoCode`; `ChuCreatedAt`; `ChuAttemptedAt`; `ChuStatus` → `ChuDelivery​Status`; `ChuProviderMessageId`; `ChuAcceptedAt`; `ChuDeliveredAt`; `ChuFailedAt`; `ChuErrorMessage`], [`EXISTS_OK`], [3], [34, 36],
  [Purchase], [`ChuPurchase`], [раздел], [`Name`; `ChuPurchasedAt`; `ChuAmountBeforeDiscount`; `ChuDiscountAmount`; `ChuFinalAmount`; `ChuPromoCode` → `ChuPromoCode`], [`EXISTS_OK`], [2], [35, 42],
  [Purchase​Item], [`ChuPurchase​Item`], [деталь], [`Name`; `ChuPurchase` → `ChuPurchase`; `ChuProduct` → `Product`; `ChuQuantity`; `ChuUnitPrice`; `ChuLineDiscountAmount`], [`EXISTS_OK`], [3], [37, 45],
  [Product], [`Product`], [раздел], [`Name`, `Description`, `Price`; `ChuPublished`; `ChuProduct​Group` → `ChuProduct​Group`], [`REUSE_​STANDARD`], [3], [19, 38],
  [Product​Group], [`ChuProduct​Group`], [справочник], [`Name`, `Description`; ссылки из `Product`, `Test​Version`, `PromoCode`], [`EXISTS_OK`], [2], [5-7, 19],
  [Employee​Account], [`SysAdmin​Unit` / `Vw​System​Users`], [штатный механизм], [штатные пользователи], [`REUSE_​STANDARD`], [-], [8],
  [Role], [`SysAdmin​Unit` / `SysAdminUnit​In​Role`], [штатный механизм], [штатные организационные и функциональные роли], [`REUSE_​STANDARD`], [-], [8],
  [Permission], [`SysAdmin​Operation` / `Sys​Entity​Schema​Operation​Right`], [штатный механизм], [штатные полномочия и права на объекты], [`REUSE_​STANDARD`], [-], [8],
  [Admin​Session], [`SysUser​Session` / журнал аудита], [штатный механизм], [штатные сеансы и аудит], [`REUSE_​STANDARD`], [-], [8],
)
]

Связка `ChuRolePermission` отдельным объектом не создавалась - «роль ↔ полномочие» покрывает штатная `SysAdminUnit​In​Role` / `Sys​Entity​Schema​Operation​Right`.

#pagebreak()
= Проверка работоспособности
#table(columns: (3.4fr, 2.0fr, 0.9fr), table.header([Проверка], [Объём], [Результат]),
  [Поля, типы, ссылки, доступность таблиц], [19 схем, 95 новых/добавленных полей], [PASS],
  [Основные разделы: создание, редактирование, повторное открытие], [5 разделов], [PASS],
  [Детали: добавление, автопривязка, сохранение, видимость после обновления], [11 деталей], [PASS],
  [Открытие карточек и отображение связанных данных], [14 карточек], [PASS],
  [Колонки и записи реестров], [5 разделов], [PASS],
  [Повторное чтение исходного набора и согласованность], [36 проверок], [PASS],
  [Статусные справочники], [9 справочников, 28 значений], [PASS],
  [Уникальность предметных схем в пакете], [19 кодов], [PASS],
)

В таблицах 42 учебные записи с префиксами `TEST_PR6` и `TEST_PR6_UI`, плюс две товарные группы и 28 статусных значений.

Покупка: две игры по 1000 и пазл за 500, итого 2500, скидка 200, итог 2300. Отдельный пример - позиция на 500 без скидки. Суммы введены вручную; автопересчёта нет.

У промокода источник `GAME` и заполненная игровая сессия; попытки отправки в `CREATED`, реальной рассылки не было.

Очки в ходе игры хранятся раздельно: 2 объясняющему, 1 угадавшему. Версии тестов в `DRAFT`; попытки и ответы показывают структуру данных - движок тестирования не запускался.

#pagebreak()
== Снимки тестовых записей

#fig("ris32.png", [Полный набор полей промокода],
  [На снимке показана карточка промокода с полным набором полей: код, email получателя, источник, статус, товарная группа, срок действия, процент скидки, даты жизненного цикла и ссылки-основания.],
  [Поля `PromoCode`, включая даты жизненного цикла и основания `Game​Session`/`Test​Attempt`.],
  [Источник `GAME`: сессия заполнена, попытка пуста; внешней отправки не было.])

#fig("ris33.png", [Попытки отправки промокода],
  [На снимке показана карточка промокода с деталью попыток отправки: видны несколько записей в ожидающем статусе.],
  [Связь `PromoCode` → `PromoSend​Attempt`.],
  [`CREATED` - запись создана, доставки не было.])

#fig("ris34.png", [Покупка с двумя позициями],
  [На снимке показана карточка покупки: сумма до скидки 2500, скидка 200, итог 2300, ссылка на промокод и деталь с двумя позициями.],
  [Связь `Purchase` → `Purchase​Item`.],
  [2500 - 200 = 2300; введено вручную.])

#fig("ris35.png", [Неотправленная попытка доставки],
  [На снимке показана карточка попытки отправки: ссылка на промокод, дата создания и статус `CREATED`; дата фактической отправки и подтверждения провайдера пусты.],
  [Атрибуты `PromoSend​Attempt.createdAt`, `attemptedAt`, `status`.],
  [`attemptedAt` пуст до реальной отправки.])

#fig("ris36.png", [Позиция покупки],
  [На снимке показана карточка позиции покупки: ссылки на покупку и товар, количество, цена за единицу и скидка по строке.],
  [Атрибуты `Purchase​Item.purchase`, `product`, `quantity`, `unitPrice`, `lineDiscountAmount`.],
  [Скидка позиции отдельно от скидки покупки.])

#fig("ris44.png", [Позиция покупки с нулевой скидкой],
  [На снимке показана покупка из UI-примера на сумму 500 с одной позицией «пазл» и нулевой скидкой.],
  [Связь `Purchase` → `Purchase​Item`; `lineDiscountAmount` = 0.],
  [500 - 0 = 500.])

#pagebreak()
= Ограничения и дальнейшие этапы
Автоматических бизнес-правил нет: XOR оснований промокода, пересчёт скидок и сумм, начисление очков, иммутабельность опубликованной версии не реализованы. Записи заполнены корректно вручную; для запретов нужны процессы или доработка.

`Report` и дашборды не создавались; доступ, пароли и сеансы - штатные механизмы платформы.

Все снимки - реальный стенд; рисунки 2-9 показывают состояние до доработки.

= Заключение
На стенде настроены объекты, справочники, пять разделов и 11 деталей ProfIT; сохранение, типы и связи проверены. Все 24 сущности сопоставлены с артефактами BPMSoft. Автоматика бизнес-правил в эту работу не входила.

= Список использованных источников
+ Материалы проекта ProfIT: доменная модель (`Domennaya model.puml`), рабочая тетрадь переноса `docs/report/bpmsoft/`, финальный отчёт о ходе работ `ProfIT_Practice_6_Final.docx` (срез 13.11.2026 23:18).
+ Репозиторий команды: `https://github.com/Professor-Severus-Snape/BPMSoft` - артефакты этапов №1-№5.
+ Учебный стенд `study-mirea389.cloudbpm.ru` - снимки и состояние конфигурации.
