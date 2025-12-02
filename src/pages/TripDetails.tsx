
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trip, Agency, Booking } from '../types'; // Import Booking type
import { MapPin, Clock, Share2, Heart, MessageCircle, ArrowLeft, Star, ShieldCheck, CheckCircle, XCircle, Calendar, CreditCard, ChevronDown, ChevronUp, Check, X, Tag, Search, Loader } from