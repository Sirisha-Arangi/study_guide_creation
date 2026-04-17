from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models import Document, DocumentChunk
from .vector_store import vector_store
from .llm_service import llm_service
from .web_search_service import web_search_service
from ..config import settings


class RAGService:
    """Retrieval-Augmented Generation (RAG) service."""

    # -------------------------
    # INGEST DOCUMENT
    # -------------------------
    async def ingest_document(self, db: Session, document_id: int) -> bool:
        try:
            print("Ingesting document:", document_id)

            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise Exception("Document not found")

            chunks = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id == document_id)
                .order_by(DocumentChunk.chunk_index)
                .all()
            )

            if not chunks:
                raise Exception("No chunks found")

            texts = [chunk.content for chunk in chunks]

            metadatas = [
                {
                    "document_id": document_id,
                    "chunk_index": chunk.chunk_index,
                }
                for chunk in chunks
            ]

            ids = [f"{document_id}_{chunk.chunk_index}" for chunk in chunks]

            # Store in vector DB
            embedding_ids = vector_store.add_documents(
                documents=texts,
                metadata=metadatas,
                ids=ids
            )

            # Save embedding IDs to DB
            for i, chunk in enumerate(chunks):
                chunk.embedding_id = embedding_ids[i]

            db.commit()

            print("Document ingested successfully:", document_id)
            print("Total vectors in DB:", vector_store.count())

            return True

        except Exception as e:
            db.rollback()
            raise Exception(f"Error ingesting document: {str(e)}")

    # -------------------------
    # RETRIEVE CHUNKS
    # -------------------------
    async def retrieve_relevant_chunks(
        self,
        query: str,
        document_id: Optional[int] = None,
        n_results: int = 5,
    ) -> List[Dict[str, Any]]:

        try:
            print("========== RAG RETRIEVAL ==========")
            print("Query:", query)
            print("Document ID:", document_id)

            results = vector_store.search_documents(
                query=query,
                n_results=n_results,
                where={"document_id": document_id} if document_id else None
            )

            print("Vector search results:", results)

            if not results or not results.get("documents"):
                return []

            docs = results["documents"][0]
            metas = results.get("metadatas", [[]])[0]
            dists = results.get("distances", [[]])[0]

            retrieved = []

            for i, doc in enumerate(docs):
                meta = metas[i] if i < len(metas) else {}
                dist = dists[i] if i < len(dists) else 1.0

                retrieved.append(
                    {
                        "content": doc,
                        "metadata": meta,
                        "similarity_score": round(1 - dist, 4),
                        "document_id": meta.get("document_id"),
                        "chunk_index": meta.get("chunk_index"),
                    }
                )

            print("Retrieved chunks:", len(retrieved))
            print("===================================")

            return retrieved

        except Exception as e:
            print("Error retrieving chunks:", e)
            raise Exception(f"Error retrieving chunks: {str(e)}")

    # -------------------------
    # GENERATE RESPONSE
    # -------------------------
    async def generate_response(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
    ) -> str:

        try:
            context = "\n\n---\n\n".join(chunk["content"] for chunk in context_chunks)

            prompt = f"""
You are an AI Teaching Assistant.

Context:
{context}

Question:
{query}

Answer clearly and accurately using only the provided context.
"""

            return await llm_service.generate_text(prompt)

        except Exception as e:
            raise Exception(f"Error generating response: {str(e)}")

    # -------------------------
    # ANSWER QUESTION
    # -------------------------
    async def answer_question(
        self,
        query: str,
        document_id: Optional[int] = None,
    ) -> Dict[str, Any]:

        try:
            chunks = await self.retrieve_relevant_chunks(query, document_id)

            if not chunks:
                return {
                    "answer": "No relevant information found.",
                    "sources": [],
                    "confidence": "low",
                }

            answer = await self.generate_response(query, chunks)

            avg_score = sum(c["similarity_score"] for c in chunks) / len(chunks)
            confidence = (
                "high" if avg_score > 0.8 else "medium" if avg_score > 0.6 else "low"
            )

            return {
                "answer": answer,
                "confidence": confidence,
                "sources": [
                    {
                        "document_id": c["document_id"],
                        "chunk_index": c["chunk_index"],
                        "similarity_score": c["similarity_score"],
                    }
                    for c in chunks
                ],
            }

        except Exception as e:
            raise Exception(f"Error answering question: {str(e)}")


# Global instance
rag_service = RAGService()