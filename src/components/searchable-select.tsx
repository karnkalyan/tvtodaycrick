"use client";
import React, { useState, useRef, useEffect, useId } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon?: React.ReactNode;
  color?: string;
}

interface SearchableSelectProps {
  id?: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  required?: boolean;
  className?: string;
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  disabled = false,
  clearable = true,
  required = false,
  className = "",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query.toLowerCase())) ||
      (opt.badge && opt.badge.toLowerCase().includes(query.toLowerCase()))
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setOpen(false);
      }
    }
  };

  return (
    <div className={`searchable-select ${className}`} ref={containerRef}>
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`searchable-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="searchable-trigger-content" style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          {selectedOption ? (
            <>
              {selectedOption.icon}
              {selectedOption.color && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: selectedOption.color,
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="badge" style={{ fontSize: "10px", padding: "1px 5px" }}>
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: "var(--muted)" }}>{placeholder}</span>
          )}
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--muted)", flexShrink: 0 }}>
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{ padding: "2px", cursor: "pointer", borderRadius: "3px" }}
              title="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
        </span>
      </button>

      {/* Hidden input for form submission */}
      <input type="hidden" value={value} required={required} />

      {open && (
        <div className="searchable-popover" role="listbox">
          <div className="searchable-filter-row">
            <Search size={14} color="var(--muted)" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="searchable-filter-input"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} style={{ color: "var(--muted)", padding: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="searchable-options">
            {filteredOptions.length === 0 ? (
              <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                No results found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`searchable-option ${isSelected ? "selected" : ""} ${isHighlighted ? "highlighted" : ""}`}
                  >
                    {opt.icon}
                    {opt.color && (
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: opt.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: isSelected ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span className="badge" style={{ fontSize: "10px", padding: "1px 5px" }}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                          {opt.sublabel}
                        </small>
                      )}
                    </div>
                    {isSelected && <Check size={14} color="var(--brand)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
