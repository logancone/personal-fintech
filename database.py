import sqlite3
from sqlalchemy import create_engine, Column, Integer, String, Date, Text, ForeignKey, Numeric
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Mapped, mapped_column

# from datetime import date
import datetime
from decimal import Decimal

from dataclasses import dataclass

import os


# Superclass for all table classes
class Base(DeclarativeBase):
    pass

# Create table for users
class Transaction(Base):
    __tablename__ = 'transaction'

    transaction_id: Mapped[str] = mapped_column(primary_key=True)
    merchant_name: Mapped[str]
    amount: Mapped[Decimal] = mapped_column(Numeric(precision=19, scale=4))
    date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    category: Mapped[str]
    pending: Mapped[bool]
    pending_transaction_id: Mapped[str] = mapped_column(nullable=True)
    
class Item(Base):
    __tablename__ = 'item'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    cursor: Mapped[str] = mapped_column(nullable=True)

# Function to actually initialize all the tables
def create_tables():
    Base.metadata.create_all(engine)

# Creates the engine and the Session class, doesn't actually create a session though
engine = create_engine("sqlite:///app_database.db")

Session = sessionmaker(bind=engine)