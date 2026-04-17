import chromadb
from typing import List, Dict, Any, Optional
from ..config import settings
from sentence_transformers import SentenceTransformer
import chromadb.utils.embedding_functions as embedding_functions


class VectorStore:
    """ChromaDB vector store for document embeddings."""

    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.chroma_db_path)
        
        # Create embedding function
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        
        self.collection = self.client.get_or_create_collection(
            name="documents",
            embedding_function=self.embedding_function,
            metadata={"hnsw:space": "cosine"}
        )

        print("Vector store initialized with SentenceTransformer embedding function")

    # -------------------------
    # ADD DOCUMENTS
    # -------------------------
    def add_documents(
        self,
        documents: List[str],
        metadata: List[Dict[str, Any]],
        ids: List[str]
    ) -> List[str]:
        """Add documents - ChromaDB will auto-generate embeddings."""
        try:
            self.collection.add(
                documents=documents,
                metadatas=metadata,
                ids=ids
            )

            print(f"Stored documents: {len(documents)}")
            return ids

        except Exception as e:
            raise Exception(f"Error adding documents to vector store: {str(e)}")

    # -------------------------
    # SEARCH DOCUMENTS
    # -------------------------
    def search_documents(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Search similar documents - ChromaDB will auto-generate query embeddings."""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where
            )

            return results

        except Exception as e:
            raise Exception(f"Error searching documents: {str(e)}")

    # -------------------------
    # DELETE DOCUMENTS
    # -------------------------
    def delete_documents(self, ids: List[str]) -> bool:
        try:
            self.collection.delete(ids=ids)
            return True
        except Exception as e:
            raise Exception(f"Error deleting documents: {str(e)}")

    # -------------------------
    # COUNT DOCUMENTS
    # -------------------------
    def count(self):
        return self.collection.count()


# Global instance
vector_store = VectorStore()