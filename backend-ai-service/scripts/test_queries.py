import requests
import json
import sys

# Workspace ID for thanh.nx225460@sis.hust.edu.vn
workspace_id = "29df1bb2-391c-42a6-9413-732db73ddc23"
base_url = "http://localhost:8000/api/v1"

def test_query(query):
    print(f"\n{'='*50}")
    print(f"Query: {query}")
    print(f"{'='*50}")
    try:
        response = requests.post(
            f"{base_url}/workspaces/{workspace_id}/query",
            json={"query": query}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"Answer: {data.get('answer')}")
            
            # Print full data for debugging
            print(f"\nDEBUG: Full Response Data keys: {list(data.keys())}")
            print(f"DEBUG: Metadata keys: {list(data.get('metadata', {}).keys())}")
            
            # Access inner metadata
            # QueryResponse.metadata = result
            # result['metadata'] = inner_metadata
            inner_metadata = data.get('metadata', {}).get('metadata', {})
            
            # Print Execution Plan
            plan = inner_metadata.get('execution_plan', {})
            if plan:
                print("\n📋 Execution Plan:")
                for step in plan.get('steps', []):
                    print(f"  - [{step['agent']}] {step['type']}: {step['query']}")
            else:
                print("\n⚠️ No Execution Plan found in inner metadata")

            # Print Step Results
            steps = inner_metadata.get('step_results', [])
            if steps:
                print("\n🔍 Step Results:")
                for step in steps:
                    print(f"\n  Step: {step['step_id']} ({step.get('success')})")
                    result = step.get('result', {})
                    
                    # Check for citations (Document Agent)
                    if 'citations' in result and isinstance(result['citations'], list):
                        print(f"    Found {len(result['citations'])} citations:")
                        for i, citation in enumerate(result['citations']):
                            content = citation.get('chunk_text', '')
                            score = citation.get('score', 'N/A')
                            # Format score properly
                            if isinstance(score, (int, float)):
                                score_str = f"{score:.3f}"
                            else:
                                score_str = str(score)
                            doc_name = citation.get('document_name', 'Unknown')
                            doc_id = citation.get('document_id', 'Unknown')
                            chunk_id = citation.get('chunk_id', 'Unknown')
                            
                            print(f"      {i+1}. [{score_str}] {doc_name} (doc_id: {doc_id[:8]}..., chunk_id: {chunk_id[:8]}...)")
                            if content:
                                print(f"          Content ({len(content)} chars): {content[:150].replace(chr(10), ' ')}...")
                            else:
                                print(f"          ⚠️ WARNING: Empty chunk_text!")
                                print(f"          Citation keys: {list(citation.keys())}")
                    
                    # Check for document results
                    elif 'results' in result and isinstance(result['results'], list):
                        print(f"    Found {len(result['results'])} results:")
                        for i, chunk in enumerate(result['results']):
                            print(f"      {i+1}. Chunk keys: {list(chunk.keys())}")
                            # Try different possible keys
                            content = chunk.get('content', chunk.get('text', chunk.get('chunk_text', '')))
                            if content:
                                print(f"          Content: {content[:150].replace(chr(10), ' ')}...")
                    
                    # Check for task results
                    elif 'tasks' in result:
                        print(f"    Found {len(result['tasks'])} tasks")
                        if result['tasks']:
                            task = result['tasks'][0]
                            print(f"      Example: {task.get('title', 'N/A')}")
                    
                    # Check for SQL query results
                    elif 'generated_sql' in result:
                        print(f"    SQL Query: {result.get('generated_sql')}")
                        print(f"    Row count: {result.get('row_count', 0)}")
                    
                    else:
                        print(f"    Result keys: {list(result.keys())}")
                        # Print first 200 chars of answer if exists
                        if 'answer' in result:
                            print(f"    Answer preview: {result['answer'][:200]}...")
            else:
                print("\n⚠️ No Step Results found in inner metadata")

        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_query("What are the goals of the project?")
    test_query("When is the kickoff meeting and what is the agenda?")
