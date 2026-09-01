@echo off
setlocal

set CONTAINER_NAME=favorecidos_postgres
set DB_USER=app_user
set DB_NAME=favorecidos_db
set SQL_FILE=scripts\update-favorecidos.sql

if not exist "%SQL_FILE%" (
  echo Arquivo SQL nao encontrado: %SQL_FILE%
  exit /b 1
)

echo Aplicando atualizacao do banco %DB_NAME% no container %CONTAINER_NAME%...
docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME% < "%SQL_FILE%"

if errorlevel 1 (
  echo Falha ao aplicar atualizacao do banco.
  exit /b 1
)

echo Atualizacao concluida com sucesso.
exit /b 0