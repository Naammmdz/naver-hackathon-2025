package com.naammm.becore.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import com.naammm.becore.entity.Document;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import com.naammm.becore.repository.DocumentRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {

    private final DocumentRepository documentRepository;

    public List<Document> getAllDocuments() {
        return documentRepository.findByTrashedFalse();
    }

    public Optional<Document> getDocumentById(String id) {
        return documentRepository.findById(id);
    }

    public List<Document> getDocumentsByParentId(String parentId) {
        return documentRepository.findByParentIdAndTrashedFalse(parentId);
    }

    public List<Document> getTrashedDocuments() {
        return documentRepository.findByTrashedTrue();
    }

    public Document createDocument(Document document) {
        return documentRepository.save(document);
    }

    public Document updateDocument(String id, Document updatedDocument) {
        return documentRepository.findById(id)
                .map(document -> {
                    document.setTitle(updatedDocument.getTitle());
                    document.setContent(updatedDocument.getContent());
                    document.setIcon(updatedDocument.getIcon());
                    document.setParentId(updatedDocument.getParentId());
                    return documentRepository.save(document);
                })
                .orElseThrow(() -> new RuntimeException("Document not found"));
    }

    public void deleteDocument(String id) {
        documentRepository.findById(id).ifPresent(document -> {
            document.setTrashed(true);
            document.setTrashedAt(LocalDateTime.now());
            documentRepository.save(document);
        });
    }

    public void permanentlyDeleteDocument(String id) {
        documentRepository.deleteById(id);
    }

    public void restoreDocument(String id) {
        documentRepository.findById(id).ifPresent(document -> {
            document.setTrashed(false);
            document.setTrashedAt(null);
            documentRepository.save(document);
        });
    }

    public List<Document> searchDocuments(String search) {
        if (search == null || search.trim().isEmpty()) {
            return getAllDocuments();
        }
        return documentRepository.searchDocuments(search.trim());
    }
}