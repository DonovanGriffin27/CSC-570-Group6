from db.connection import get_connection
from db.queries.case_queries import create_case, get_case_by_id, get_all_cases


def test_create_case(conn):
    title = input("Enter case title: ")
    priority = input("Enter priority (Low, Medium, High): ").capitalize()

    case_id = create_case(conn, title, priority)
    print("Created case ID:", case_id)

    return case_id


def test_get_case_by_id(conn):
    case_id = int(input("Enter case ID to fetch: "))

    case = get_case_by_id(conn, case_id)

    if case:
        print("Case found:", case)
    else:
        print("No case found with that ID")

def test_get_all_cases(conn):
    cases = get_all_cases(conn)

    if cases:
        print("\nAll Cases:")
        for case in cases:
            print(case)
    else:
        print("No cases found")


# Main runner
if __name__ == "__main__":
    try:
        conn = get_connection()
        print("\n1. Create Case")
        print("2. Get Case by ID")
        print("3. Get All Cases")
        print("[-1 to close]")

        choice = input("Choose an option: ")

        while choice != "-1":
            if choice == "1":
                test_create_case(conn)
            elif choice == "2":
                test_get_case_by_id(conn)
            elif choice == "3":
                test_get_all_cases(conn)
            else:
                print("Invalid option")
            print("\n1. Create Case")
            print("2. Get Case by ID")
            print("3. Get All Cases")
            print("[-1 to close]")

            choice = input("Choose an option: ")

        conn.close()

    except Exception as e:
        print("Error:", e)