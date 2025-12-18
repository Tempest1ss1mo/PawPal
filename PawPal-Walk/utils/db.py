import os
import pymysql

def get_connection():
    return pymysql.connect(
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS"),
        unix_socket=f"/cloudsql/{os.getenv('INSTANCE_CONNECTION_NAME')}",
        database=os.getenv("DB_NAME"),
        cursorclass=pymysql.cursors.DictCursor
    )