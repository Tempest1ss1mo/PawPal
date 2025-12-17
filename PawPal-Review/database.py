import os
from typing import Any
import mysql.connector
from mysql.connector.pooling import PooledMySQLConnection
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")
CLOUD_SQL_CONNECTION_NAME = os.getenv("CLOUD_SQL_CONNECTION_NAME")

DB_SOCKET_DIR = "/cloudsql"

MYSQL_CONFIG: dict[str, str | int] = {
    "user": DB_USER,
    "password": DB_PASS,
    "database": DB_NAME,
    "unix_socket": f"{DB_SOCKET_DIR}/{CLOUD_SQL_CONNECTION_NAME}",
}


class MySQLPool:
    def __init__(self, pool_size: int, **kwargs: dict[str, Any]) -> None:
        self._user: str = kwargs.get("user", "root")
        self._password: str = kwargs.get("password", "")
        self._database: str = kwargs.get("database", "test")
        self._unix_socket: str = kwargs.get("unix_socket", "")
        self._pool_size: int = pool_size

        self.dbconfig: dict[str, Any] = {
            "user": self._user,
            "password": self._password,
            "database": self._database,
            "unix_socket": self._unix_socket,
        }

        self.pool = None
        self._initialized = False

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            self.pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="cloudSQL_pool",
                pool_size=self._pool_size,
                pool_reset_session=True,
                **self.dbconfig,
            )
            self._initialized = True
            print(
                f"Cloud SQL connection pool established via Unix socket: {self._unix_socket}"
            )

    def initialize(self) -> None:
        self._ensure_initialized()

    def get_connection(self) -> PooledMySQLConnection:
        self._ensure_initialized()
        return self.pool.get_connection()

    def close(self, sql_conns: PooledMySQLConnection) -> None:
        sql_conns.close()

    def execute(self, sql: str, params: tuple[Any, ...] | None = None) -> None:
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params)
                conn.commit()
        except Exception as e:
            raise e
        finally:
            conn.close()

    def fetchall(
        self, sql: str, params: tuple[Any, ...] | None = None
    ) -> list[dict[str, Any]]:
        conn = self.get_connection()
        try:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
        except Exception as e:
            raise e
        finally:
            conn.close()

    def fetchone(
        self, sql: str, params: tuple[Any, ...] | None = None
    ) -> dict[str, Any] | None:
        conn = self.get_connection()
        try:
            with conn.cursor(dictionary=True) as cursor:
                cursor.execute(sql, params)
                return cursor.fetchone()
        except Exception as e:
            raise e
        finally:
            if conn.is_connected():
                conn.close()


mysql_pool = MySQLPool(5, **MYSQL_CONFIG)
