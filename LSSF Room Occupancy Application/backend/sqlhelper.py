import mysql.connector
from  mysql.connector import Error

def create_connection(host_name, user_name, user_password, db_name):
    connection = None
    try:
        connection = mysql.connector.connect(
            host =  host_name,
            user = user_name,
            password = user_password,
            database = db_name
        )
    except Error as e:
        print(f"The error '{e}' has occured")
    return connection

def execute_query(connection, query, values=None):
    cursor = connection.cursor(dictionary=True)
    try:
        if values:
            cursor.execute(query, values) #chat gpt aided values to be able to insert values into the table using POST
            connection.commit()
        else:
            cursor.execute(query)
            connection.commit()
        print("Query executed successfully")
    except mysql.connector.Error as e:
        print(f"The error '{e}' has occurred")


def execute_read_query(connection, query, values=None): #added a values argument to be able to parse through queries
    cursor = connection.cursor(dictionary=True)
    result =  None
    try:
        cursor.execute(query, values)
        result = cursor.fetchall()
        return result
    except Error as e:
         print(f"The error '{e}' has occured")
            