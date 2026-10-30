#set page(
  paper: "a4",
  margin: 2.5cm
)
#let monthgen(plus:0, minus:0) = {
  let date = datetime.today()
  let pl = duration(days:plus)
  let min = duration(days:minus)
  date = date + pl - min
  if date.month() == 9 {
    return "«"+str(date.day())+"» Сентября "+str(date.year())+ "г."
  }
  else {
    if date.month() == 10 {
    return "«"+str(date.day())+"» Октября "+str(date.year())+ "г."
  }
  else {
    
    if date.month() == 11 {
    return "«"+str(date.day())+"» Ноября "+str(date.year())+ "г."
  }
  else {
    return "none"
    
  }
  }
    
  }

  
}

#set align(center)

#image("images/flag.png", width: 3cm)

#v(0.5cm)

*МИНОБРНАУКИ РОССИИ* \
Федеральное государственное бюджетное образовательное учреждение \
высшего образования \
*«МИРЭА – Российский технологический университет»* \

#v(0.5cm)

*РТУ МИРЭА* \
#line(length: 100%)
#line(length: 100%, start: (0pt, -15pt))

*Институт информационных технологий (ИИТ)* \
*Кафедра цифровой трансформации (ЦТ)* \


#v(1cm)

*ОТЧЕТ ПО ПРАКТИЧЕСКОЙ РАБОТЕ* \
по дисциплине «Технологии проектирования и быстрой разработки приложений и сервисов» \
#v(1cm)

#set align(center)
*Практическая работа №4*
#v(1cm)

#set align(left)

#grid(
  stroke: none,
  align: (left,left, center),
  columns: (130pt, 220pt, 100pt),
  rows: (10pt,3pt,15pt),
  [Магистрант группы ПТМО-01-25:],
  [Чугунова Д. И., Муромцева М.Д., Николаев А.С, Исаев В.В.],
  [],[],[],
  grid.cell(
    line(
      length: 100%
    )
  ),
  [],[],[(подпись)]
)


#v(0.5cm)

#grid(
  stroke: none,
  align: (left,left, center),
  columns: (130pt, 220pt, 100pt),
  rows: (10pt,3pt,1pt),
  [Преподаватель],
  [Снимщиков К. А.],
  [],[],[],
  grid.cell(
    line(
      length: 100%
    )
  ),
  [],[],[(подпись)]
)

#v(1cm)
#let today = datetime.today()
#grid(
  stroke: none,
  align: (left,left),
  columns: (130pt,220pt),
  [Отчет представлен],
  
  [16.10.2026]
)

#v(4cm)

#set align(center)
Москва #today.year() г.

