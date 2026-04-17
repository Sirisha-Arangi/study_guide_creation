from tavily import TavilyClient
from typing import List, Dict, Any
from ..config import settings


class WebSearchService:
    """Tavily web search service for academic content."""

    def __init__(self):
        self.client = TavilyClient(api_key=settings.tavily_api_key)

    async def search_academic_content(self, topic: str, max_results: int = 5) -> str:
        """
        Search for academic content related to the topic.
        
        Args:
            topic: The topic to search for
            max_results: Maximum number of results to retrieve
            
        Returns:
            Formatted string with search results
        """
        try:
            # Perform web search with academic focus
            response = self.client.search(
                query=f"{topic} academic study material educational content",
                search_depth="advanced",
                include_answer=True,
                include_raw_content=True,
                max_results=max_results,
                include_domains=["*.edu", "*.org", "*.gov"]  # Prioritize academic sources
            )
            
            # Format the search results
            formatted_content = []
            
            if response.get("answer"):
                formatted_content.append(f"Summary: {response['answer']}")
            
            for result in response.get("results", []):
                title = result.get("title", "")
                content = result.get("content", "")
                url = result.get("url", "")
                
                if content and len(content) > 50:  # Filter out very short snippets
                    formatted_content.append(f"Source: {title}\nContent: {content[:500]}...")
            
            return "\n\n".join(formatted_content) if formatted_content else "No relevant web content found."
            
        except Exception as e:
            # Return empty string if search fails, but don't break the flow
            print(f"Web search error: {str(e)}")
            return "Web search temporarily unavailable."


# Global instance
web_search_service = WebSearchService()
