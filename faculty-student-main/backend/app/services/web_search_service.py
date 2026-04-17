from tavily import TavilyClient
from ..config import settings


class WebSearchService:
    def __init__(self):
        if not settings.tavily_api_key:
            raise ValueError("TAVILY_API_KEY is not set")
        self.client = TavilyClient(api_key=settings.tavily_api_key)

    async def search_academic_content(
        self,
        topic: str,
        max_results: int = 3
    ) -> str:
        """
        Fetch academic-quality web content for Web-RAG.
        """

        try:
            response = self.client.search(
                query=topic,
                max_results=max_results,
                search_depth="advanced",
                include_domains=[
                    "wikipedia.org",
                    "arxiv.org",
                    "mit.edu",
                    "stanford.edu",
                    "ibm.com",
                ],
            )

            contents = []
            for item in response.get("results", []):
                text = item.get("content", "")
                if text:
                    contents.append(text[:400])  # HARD LIMIT (IMPORTANT)

            return "\n\n".join(contents)

        except Exception as e:
            print("Web search error:", e)
            return ""
    

# 🌍 Global instance
web_search_service = WebSearchService()
