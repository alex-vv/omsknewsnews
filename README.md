# Архив сайта omsknews.ru из Wayback Machine

## Скрипты 

в каталоге scripts/

 - download.rb - загрузка из Wayback Machine
 - parse.py - парсинг загруженных страниц, преобразование в json
 - load_db.py - загрузка полученного json в PostgreSQL

## Сайт

в каталоге web - сайт на next.js / PostgreSQL с поиском по загруженным статьям

## Примерный workflow

установка зависимостей:
```
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

скачивание с web archive:

```
nohup caffeinate -i ruby scripts/download.rb > download.log 2>&1
```

конвертация в json:

```
.venv/bin/python scripts/parse.py "target/omsknews.ru" articles.json
```

закачка в базу:

```
DATABASE_URL=<POSTGRESQL_DB_URL> \ .venv/bin/python scripts/load_db.py articles.json
```
