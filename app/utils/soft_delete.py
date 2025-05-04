from datetime import datetime
from sqlalchemy import Column, Boolean, DateTime, event
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import Query

# Create a custom query class that automatically filters out soft-deleted records
class SoftDeleteQuery(Query):
    """Query class that automatically filters out soft-deleted records."""
    
    def get(self, ident):
        # Override get to handle soft-deleted records
        obj = super(SoftDeleteQuery, self).get(ident)
        if obj is None:
            return None
            
        if hasattr(obj, 'is_deleted') and obj.is_deleted:
            # If this is being called with with_deleted=True, return the object
            if hasattr(self, '_with_deleted') and self._with_deleted:
                return obj
            # Otherwise return None as if it doesn't exist
            return None
        return obj
        
    def __new__(cls, *args, **kwargs):
        obj = super(SoftDeleteQuery, cls).__new__(cls)
        obj._with_deleted = kwargs.pop('_with_deleted', False)
        return obj
        
    def __init__(self, *args, **kwargs):
        self._with_deleted = kwargs.pop('_with_deleted', False)
        super(SoftDeleteQuery, self).__init__(*args, **kwargs)
    
    def _get_entities(self):
        # Get the entity classes for this query
        # This is a safer way to get entities that works across SQLAlchemy versions
        entities = []
        if not hasattr(self, '_entities'):
            return entities
            
        for entity in self._entities:
            if hasattr(entity, 'entity_zero'):
                entities.append(entity.entity_zero.class_)
            elif hasattr(entity, 'mapper') and hasattr(entity.mapper, 'class_'):
                entities.append(entity.mapper.class_)
        return entities
    
    def filter_deleted(self):
        """Add the is_deleted=False filter to the query."""
        # If this query is already set to include deleted records, return as is
        if hasattr(self, '_with_deleted') and self._with_deleted:
            return self
            
        # Create a new query to avoid modifying self
        query = self
        
        # Check if we've already applied the filter to avoid recursion
        if hasattr(self, '_filtered_deleted') and self._filtered_deleted:
            return query
            
        # Get all entity classes in this query
        entities = self._get_entities()
        
        # Add is_deleted=False filter for each entity that has the column
        for entity in entities:
            if hasattr(entity, 'is_deleted'):
                query = query.filter(entity.is_deleted == False)
        
        # Mark this query as having the filter applied
        query._filtered_deleted = True
                
        return query
    
    def with_deleted(self):
        """Include soft-deleted records in the query."""
        # If already including deleted records, return self
        if hasattr(self, '_with_deleted') and self._with_deleted:
            return self
            
        # Create a new query with _with_deleted=True
        query = self.__class__(self._only_full_mapper_zero('with_deleted'),
                            session=self.session, _with_deleted=True)
        return query
    
    def without_deleted(self):
        """Explicitly exclude soft-deleted records from the query."""
        # If already filtering deleted records, return self
        if hasattr(self, '_filtered_deleted') and self._filtered_deleted:
            return self
            
        # Apply the filter
        return self.filter_deleted()
    
    def __iter__(self):
        """Apply soft delete filter before iterating."""
        # Prevent infinite recursion
        if hasattr(self, '_with_deleted') and self._with_deleted:
            return super(SoftDeleteQuery, self).__iter__()
            
        # Apply filter and then call parent's __iter__
        query = self.filter_deleted()
        # Use the parent class's __iter__ method to avoid recursion
        return super(SoftDeleteQuery, query.__class__).__iter__(query)
    
    def count(self):
        """Apply soft delete filter before counting."""
        # Prevent infinite recursion
        if hasattr(self, '_with_deleted') and self._with_deleted:
            return super(SoftDeleteQuery, self).count()
            
        # Apply filter and then call parent's count
        query = self.filter_deleted()
        return super(SoftDeleteQuery, query.__class__).count(query)
        
    def paginate(self, page=None, per_page=None, error_out=True, max_per_page=None):
        """Apply soft delete filter before paginating.
        
        This method replicates Flask-SQLAlchemy's paginate functionality for our custom query class.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            error_out: Abort with 404 if page/per_page are invalid
            max_per_page: Maximum items per page
            
        Returns:
            A Pagination object with the results
        """
        # Import here to avoid circular imports
        from flask_sqlalchemy import Pagination
        
        # Prevent infinite recursion
        if hasattr(self, '_with_deleted') and self._with_deleted:
            # Use the parent's paginate method if available
            if hasattr(super(SoftDeleteQuery, self), 'paginate'):
                return super(SoftDeleteQuery, self).paginate(
                    page=page, per_page=per_page, error_out=error_out, max_per_page=max_per_page
                )
        
        # Apply filter for soft-deleted records
        query = self.filter_deleted()
        
        # Default values
        if page is None:
            page = 1
        if per_page is None:
            per_page = 20
        if max_per_page is not None:
            per_page = min(per_page, max_per_page)
        
        # Calculate offset and limit
        items = query.limit(per_page).offset((page - 1) * per_page).all()
        
        # Get total count without pagination
        total = query.order_by(None).count()
        
        # Create pagination object
        return Pagination(query, page, per_page, total, items)

class SoftDeleteMixin:
    """Mixin class to add soft deletion capability to SQLAlchemy models."""
    
    # Define query_class at the class level
    query_class = SoftDeleteQuery
    
    # Add soft delete columns
    @declared_attr
    def is_deleted(cls):
        return Column(Boolean, default=False, nullable=False, index=True)
    
    @declared_attr
    def deleted_at(cls):
        return Column(DateTime, nullable=True)
    
    def soft_delete(self):
        """Mark the record as deleted."""
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
    
    def restore(self):
        """Restore a soft-deleted record."""
        self.is_deleted = False
        self.deleted_at = None

# Helper functions for working with soft-deleted records
def initialize_soft_delete(db):
    """Initialize soft delete functionality for all models."""
    # Set the query class for all models that use SoftDeleteMixin
    if not hasattr(db.Model, '_decl_class_registry'):
        return
        
    for model in db.Model._decl_class_registry.values():
        if hasattr(model, '__tablename__') and hasattr(model, '__class__') and issubclass(model.__class__, SoftDeleteMixin):
            model.query_class = SoftDeleteQuery
            
    # Register event listeners for soft delete
    @event.listens_for(db.session, 'after_flush')
    def after_flush(session, flush_context):
        """Update timestamps for soft-deleted records."""
        for obj in session.deleted:
            if isinstance(obj, SoftDeleteMixin):
                # Convert hard delete to soft delete
                session.add(obj)
                obj.soft_delete()

def with_deleted(query):
    """Include soft-deleted records in the query."""
    if hasattr(query, 'with_deleted'):
        return query.with_deleted()
    return query

def without_deleted(query):
    """Explicitly exclude soft-deleted records from the query."""
    if hasattr(query, 'without_deleted'):
        return query.without_deleted()
    return query
