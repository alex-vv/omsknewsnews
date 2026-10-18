# Архив сайта omsknews.ru из Wayback Machine

## Скрипты 

в каталоге scripts/

 - download.rb - загрузка из Wayback Machine
 - parse.py - парсинг загруженных страниц, преобразование в json
 - load_db.py - загрузка полученного json в PostgreSQL

## Сайт

в каталоге web - Svelte-фронтенд (собирается Quarkus web-bundler), API и БД - PostgreSQL через Quarkus

### запуск prod

Требуется JDK 25. Используйте `./mvnw` (или задайте `JAVA_HOME` на JDK 25):

```
./mvnw package
```

```
QUARKUS_DATASOURCE_JDBC_URL='jdbc:postgresql://localhost:5432/omsknewsnews?user=omsknewsnews' \
QUARKUS_DATASOURCE_PASSWORD='<пароль>' \
java -jar target/quarkus-app/quarkus-run.jar
```

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
DATABASE_URL='postgresql://omsknewsnews:<пароль>@localhost:5432/omsknewsnews' \
  .venv/bin/python scripts/load_db.py articles.json
```
